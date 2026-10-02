import { spawn } from 'node:child_process';
import {
  createServer,
  get,
} from 'node:http';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  satisfies,
  valid,
} from 'semver';
import { z } from 'zod';

const packageName = '@sabinmarcu/quizdeck';
const packageManager = 'yarn@4.18.1';
const webHost = '127.0.0.1';
const webPort = 4173;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const temporaryRoot = path.join(repoRoot, 'tmp');

const commandArgumentsSchema = z.tuple([z.string().min(1)]).or(z.tuple([]));
const scriptsSchema = z.record(z.string(), z.string());
const manifestSchema = z.object({
  name: z.literal(packageName),
  private: z.boolean().optional(),
  license: z.literal('MIT'),
  bin: z.union([
    z.string().min(1),
    z.strictObject({ quizdeck: z.string().min(1) }),
  ]).transform((bin) => (typeof bin === 'string' ? { quizdeck: bin } : bin)),
  engines: z.object({
    node: z.string().min(1),
  }).passthrough(),
  scripts: scriptsSchema.optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
}).passthrough();
const sqliteEvidenceSchema = z.object({
  name: z.string(),
  questionCount: z.number().int().positive(),
  answerCount: z.number().int().positive(),
}).strict();
const consumerProjectSchema = z.object({
  devDependencies: z.unknown().optional(),
}).passthrough();

type PackageManifest = z.infer<typeof manifestSchema>;

interface CommandOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
}

interface CommandResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stderr: string;
  stdout: string;
}

interface StartedProcess {
  readonly child: ReturnType<typeof spawn>;
  output(): string;
  startupError(): Error | undefined;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function formatResult(command: string, result: CommandResult): string {
  return [
    `${command} exited with ${result.code === null ? result.signal ?? 'an unknown error' : `code ${result.code}`}.`,
    result.stdout.trim(),
    result.stderr.trim(),
  ].filter((part) => part.length > 0).join('\n');
}

async function run(
  command: string,
  arguments_: readonly string[],
  options: CommandOptions,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout!.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr!.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      resolve({
        code,
        signal,
        stderr,
        stdout,
      });
    });
  });
}

async function runSuccessfully(
  command: string,
  arguments_: readonly string[],
  options: CommandOptions,
): Promise<CommandResult> {
  const result = await run(command, arguments_, options);
  if (result.code !== 0) {
    throw new Error(formatResult([command, ...arguments_].join(' '), result));
  }
  return result;
}

function parseManifest(input: string, location: string): PackageManifest {
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch (error) {
    throw new Error(`${location} is not valid JSON.`, { cause: error });
  }
  return manifestSchema.parse(value);
}

function normalizeTarEntry(entry: string): string {
  assert(entry === 'package/' || entry.startsWith('package/'), `Tarball entry is outside the package root: ${entry}`);
  const normalized = entry.slice('package/'.length).replaceAll('\\', '/');
  if (normalized.length === 0) {
    return normalized;
  }
  assert(!normalized.startsWith('/'), `Tarball contains an absolute entry: ${entry}`);
  assert(!normalized.split('/').includes('..'), `Tarball contains a parent-path entry: ${entry}`);
  return normalized;
}

function assertSafeTarballEntries(entries: readonly string[]): void {
  const forbiddenSegments = new Set([
    'src',
    'sets',
    'tmp',
    'node_modules',
    '.git',
    '.ai',
    '.github',
    'package-source',
  ]);
  const rootFiles = new Set(['package.json', 'README.md', 'LICENSE.md', 'CHANGELOG.md']);
  const secretPath = /(?:^|\/)(?:\.env(?:\.|$)|.*\.(?:key|pem|p12|pfx)$|id_rsa(?:\.|$)|credentials?(?:\.|$)|secrets?(?:\.|$))/iu;

  for (const entry of entries) {
    const normalized = normalizeTarEntry(entry);
    if (normalized.length > 0) {
      const segments = normalized.split('/');
      assert(
        normalized.startsWith('bin/') || normalized.startsWith('dist/')
          || rootFiles.has(normalized),
        `Tarball contains an unexpected published file: ${entry}`,
      );
      assert(
        segments.every((segment) => !forbiddenSegments.has(segment)),
        `Tarball contains a forbidden source or tooling path: ${entry}`,
      );
      assert(!secretPath.test(normalized), `Tarball contains a possible secret: ${entry}`);
    }
  }
}

async function listTarballEntries(tarball: string): Promise<string[]> {
  const result = await runSuccessfully('tar', ['-tzf', tarball], { cwd: repoRoot });
  const entries = result.stdout.split(/\r?\n/u).filter((entry) => entry.length > 0);
  assert(entries.length > 0, 'Packed tarball is empty.');
  return entries;
}

async function extractTarballText(tarball: string, entry: string): Promise<string> {
  return (await runSuccessfully('tar', ['-xOf', tarball, `package/${entry}`], { cwd: repoRoot })).stdout;
}

function assertPublishedAssetReferences(entries: ReadonlySet<string>, index: string): void {
  const references = Array.from(index.matchAll(/\b(?:src|href)=["']([^"']+)["']/giu), (match) => match[1]!);
  const assets = references
    .map((reference) => reference.split(/[?#]/u, 1)[0] ?? '')
    .filter((reference) => reference.endsWith('.js') || reference.endsWith('.css'));
  const javascriptAssets = assets.filter((asset) => asset.endsWith('.js'));
  const cssAssets = assets.filter((asset) => asset.endsWith('.css'));

  assert(javascriptAssets.length > 0, 'Published web index does not reference a JavaScript asset.');
  assert(cssAssets.length > 0, 'Published web index does not reference a CSS asset.');
  for (const asset of assets) {
    const publishedPath = path.posix.join('dist/web', asset.replace(/^\/+/u, ''));
    assert(entries.has(publishedPath), `Published web asset is missing: ${asset}`);
  }
}

async function inspectTarball(tarball: string, runtime: string): Promise<PackageManifest> {
  const entries = await listTarballEntries(tarball);
  assertSafeTarballEntries(entries);
  const packageEntries = new Set(entries.map(normalizeTarEntry));
  for (const required of ['bin/quizdeck.js', 'dist/cli/main.js', 'dist/web/index.html']) {
    assert(packageEntries.has(required), `Tarball is missing required artifact: ${required}`);
  }

  const manifest = parseManifest(await extractTarballText(tarball, 'package.json'), 'Packed package manifest');
  assert(manifest.private !== true, 'Packed package manifest must not be private.');
  assert(manifest.scripts?.postinstall === undefined, 'Packed package manifest must not execute postinstall.');
  assert(
    Object.keys(manifest.dependencies ?? {}).every((dependency) => (
      !(dependency === 'husky' || dependency === 'semantic-release' || dependency.startsWith('@semantic-release/'))
    )),
    'Packed package runtime dependencies must not include Husky or semantic-release.',
  );

  const binPath = manifest.bin.quizdeck.replaceAll('\\', '/');
  assert(!path.posix.isAbsolute(binPath) && !binPath.split('/').includes('..'), 'Packed quizdeck bin path must be relative.');
  assert(packageEntries.has(binPath), `Packed quizdeck bin target is missing: ${binPath}`);
  assert(satisfies(runtime, manifest.engines.node), `Supplied Node ${runtime} does not satisfy packed engines.node ${manifest.engines.node}.`);

  assertPublishedAssetReferences(packageEntries, await extractTarballText(tarball, 'dist/web/index.html'));
  return manifest;
}

async function runtimeVersion(nodeExecutable: string): Promise<string> {
  const result = await runSuccessfully(nodeExecutable, ['--version'], { cwd: repoRoot });
  const version = result.stdout.trim().replace(/^v/iu, '');
  assert(valid(version) !== null, `Supplied Node executable returned an invalid version: ${result.stdout.trim()}`);
  return version;
}

async function packageProject(workspace: string): Promise<string> {
  const tarball = path.join(workspace, 'quizdeck.tgz');
  const packageBefore = parseManifest(await readFile(path.join(repoRoot, 'package.json'), 'utf8'), 'Repository package manifest');
  try {
    await runSuccessfully('yarn', ['pack', '--out', tarball], { cwd: repoRoot });
  } catch (packError) {
    try {
      await runSuccessfully('yarn', ['exec', 'pinst', '--enable'], { cwd: repoRoot });
    } catch (restoreError) {
      throw new AggregateError([packError, restoreError], 'Packing failed and pinst could not restore the repository manifest.');
    }
    throw packError;
  }

  const packageAfter = parseManifest(await readFile(path.join(repoRoot, 'package.json'), 'utf8'), 'Repository package manifest after packing');
  assert(
    packageAfter.scripts?.postinstall === packageBefore.scripts?.postinstall
      && packageAfter.scripts?.postinstall !== undefined,
    'Packing did not restore the repository postinstall script.',
  );
  const tarballStats = await stat(tarball);
  assert(tarballStats.isFile() && tarballStats.size > 0, 'yarn pack did not create a tarball.');
  return tarball;
}

async function installConsumer(workspace: string, tarball: string): Promise<string> {
  const consumer = path.join(workspace, 'consumer');
  await mkdir(consumer, { recursive: true });
  await writeFile(path.join(consumer, 'package.json'), `${JSON.stringify({
    name: 'quizdeck-packed-consumer',
    private: true,
    packageManager,
  }, null, 2)}\n`);
  await writeFile(path.join(consumer, '.yarnrc.yml'), 'nodeLinker: node-modules\nenableScripts: true\n');
  await writeFile(path.join(consumer, 'yarn.lock'), '');
  const consumerEnvironment = {
    ...process.env,
    YARN_ENABLE_SCRIPTS: 'true',
  };
  Reflect.deleteProperty(consumerEnvironment, 'HUSKY');
  await runSuccessfully('yarn', ['add', `${packageName}@file:${tarball}`], {
    cwd: consumer,
    env: consumerEnvironment,
  });

  const consumerManifest = parseManifest(await readFile(path.join(consumer, 'node_modules', ...packageName.split('/'), 'package.json'), 'utf8'), 'Installed package manifest');
  assert(consumerManifest.scripts?.postinstall === undefined, 'Installed consumer package must not execute postinstall.');
  const consumerProject = consumerProjectSchema.parse(JSON.parse(await readFile(path.join(consumer, 'package.json'), 'utf8')));
  assert(consumerProject.devDependencies === undefined, 'Consumer project must not declare development dependencies.');
  return consumer;
}

function createQuestionSet(): string {
  return `${JSON.stringify([{
    id: 1,
    description: 'Which answer proves the packed CLI loaded this file?',
    answers: [
      {
        text: 'Correct',
        correct: true,
        justification: 'It is the one correct answer.',
      },
      {
        text: 'Incorrect one',
        correct: false,
        justification: 'Only one answer may be correct.',
      },
      {
        text: 'Incorrect two',
        correct: false,
        justification: 'Only one answer may be correct.',
      },
      {
        text: 'Incorrect three',
        correct: false,
        justification: 'Only one answer may be correct.',
      },
      {
        text: 'Incorrect four',
        correct: false,
        justification: 'Only one answer may be correct.',
      },
    ],
  }], null, 2)}\n`;
}

async function inspectStoredSet(
  nodeExecutable: string,
  database: string,
  workspace: string,
): Promise<z.infer<typeof sqliteEvidenceSchema>> {
  const inspector = path.join(workspace, 'inspect-storage.mjs');
  await writeFile(inspector, `import { DatabaseSync } from 'node:sqlite';
const database = new DatabaseSync(process.argv[2], { readonly: true });
try {
  const row = database.prepare('SELECT payload FROM progress_set WHERE id = 1').get();
  if (!row || typeof row.payload !== 'string') throw new Error('No stored question set.');
  const questionSet = JSON.parse(row.payload);
  const evidence = {
    name: questionSet.name,
    questionCount: questionSet.questionCount,
    answerCount: questionSet.questions?.[0]?.answers?.length,
  };
  process.stdout.write(JSON.stringify(evidence));
} finally {
  database.close();
}
`);
  const result = await runSuccessfully(nodeExecutable, [inspector, database], { cwd: workspace });
  return sqliteEvidenceSchema.parse(JSON.parse(result.stdout));
}

async function verifyCliConsumer(
  consumer: string,
  workspace: string,
  nodeExecutable: string,
): Promise<z.infer<typeof sqliteEvidenceSchema>> {
  const binary = path.join(consumer, 'node_modules', '.bin', 'quizdeck');
  const xdgDataHome = path.join(workspace, 'xdg-data');
  const environment = {
    ...process.env,
    XDG_DATA_HOME: xdgDataHome,
  };

  const help = await run(nodeExecutable, [binary, '--help'], {
    cwd: consumer,
    env: environment,
  });
  assert(help.code === 0, formatResult('quizdeck --help', help));
  assert(help.stdout.includes('quizdeck'), 'Installed quizdeck binary did not provide help output.');

  const questionFile = 'consumer-five-choice.json';
  await writeFile(path.join(consumer, questionFile), createQuestionSet());
  const load = await run(nodeExecutable, [binary, 'load', questionFile], {
    cwd: consumer,
    env: environment,
  });
  assert(load.code === 0, formatResult('quizdeck load', load));
  assert(load.stdout.includes('Loaded Consumer Five Choice (1 questions).'), 'Installed quizdeck binary did not report the loaded set.');

  const database = path.join(xdgDataHome, 'quizdeck', 'progress.sqlite');
  const beforeInvalidLoad = await readFile(database);
  await writeFile(path.join(consumer, 'invalid-question-set.json'), '{not JSON}\n');
  const invalidLoad = await run(nodeExecutable, [binary, 'load', 'invalid-question-set.json'], {
    cwd: consumer,
    env: environment,
  });
  assert(invalidLoad.code !== 0, 'Invalid question set unexpectedly loaded successfully.');
  const afterInvalidLoad = await readFile(database);
  assert(beforeInvalidLoad.equals(afterInvalidLoad), 'Invalid question set mutated persisted progress.');

  const evidence = await inspectStoredSet(nodeExecutable, database, workspace);
  assert(evidence.name === 'Consumer Five Choice', `Stored question set has the wrong name: ${evidence.name}`);
  assert(evidence.questionCount === 1, `Stored question set has the wrong count: ${evidence.questionCount}`);
  assert(evidence.answerCount === 5, `Stored question set has the wrong answer count: ${evidence.answerCount}`);
  return evidence;
}

async function portIsAvailable(): Promise<boolean> {
  const probe = createServer();
  try {
    await new Promise<void>((resolve, reject) => {
      probe.once('error', reject);
      probe.listen(webPort, webHost, () => resolve());
    });
    await new Promise<void>((resolve, reject) => {
      probe.close((error) => (error ? reject(error) : resolve()));
    });
    return true;
  } catch (error) {
    if (probe.listening) {
      probe.close();
    }
    if (error instanceof Error && 'code' in error && error.code === 'EADDRINUSE') {
      return false;
    }
    throw error;
  }
}

function start(
  command: string,
  arguments_: readonly string[],
  options: CommandOptions,
): StartedProcess {
  const child = spawn(command, arguments_, {
    cwd: options.cwd,
    env: options.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let error: Error | undefined;
  child.stdout!.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr!.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.once('error', (startupError) => {
    error = startupError;
  });
  return {
    child,
    output: () => output,
    startupError: () => error,
  };
}

async function waitForWebServer(process: StartedProcess): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const complete = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const onOutput = () => {
      if (process.output().includes(`Web app available at http://${webHost}:${webPort}`)) {
        complete(resolve);
      }
    };
    timeout = setTimeout(() => {
      complete(() => reject(new Error(`Timed out waiting for the packed web command.\n${process.output()}`)));
    }, 10_000);
    process.child.stdout!.on('data', onOutput);
    process.child.stderr!.on('data', onOutput);
    process.child.once('close', (code, signal) => {
      complete(() => reject(new Error(`Packed web command exited with ${code ?? signal ?? 'an unknown error'}.\n${process.output()}`)));
    });
    const startupError = process.startupError();
    if (startupError) {
      complete(() => reject(startupError));
      return;
    }
    onOutput();
  });
}

async function readWebIndex(): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = get(`http://${webHost}:${webPort}/`, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.once('error', reject);
      response.once('end', () => {
        if (response.statusCode !== 200) {
          reject(new Error(`Packed web command returned HTTP ${response.statusCode ?? 'an unknown status'}.`));
          return;
        }
        resolve(Buffer.concat(chunks).toString());
      });
    });
    request.once('error', reject);
    request.setTimeout(5000, () => request.destroy(new Error('Timed out reading packed web index.')));
  });
}

async function stop(process: StartedProcess): Promise<void> {
  if (process.child.exitCode !== null || process.child.signalCode !== null) {
    return;
  }
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      process.child.kill('SIGKILL');
    }, 5000);
    process.child.once('close', () => {
      clearTimeout(timeout);
      resolve();
    });
    process.child.kill('SIGTERM');
  });
}

async function verifyWebConsumer(consumer: string, nodeExecutable: string): Promise<string> {
  if (!await portIsAvailable()) {
    return `web limit: http://${webHost}:${webPort} was already occupied; verified packaged assets without starting the server`;
  }

  const web = start(nodeExecutable, [path.join(consumer, 'node_modules', '.bin', 'quizdeck'), 'web'], {
    cwd: consumer,
    env: process.env,
  });
  try {
    await waitForWebServer(web);
    const index = await readWebIndex();
    assert(index.includes('<div id="root">'), 'Packed web command did not serve the built index.');
    return `web served at http://${webHost}:${webPort}`;
  } catch (error) {
    if (web.output().includes('already in use')) {
      return `web limit: http://${webHost}:${webPort} became occupied; verified packaged assets without starting the server`;
    }
    throw error;
  } finally {
    await stop(web);
  }
}

async function main(): Promise<void> {
  const [nodeExecutable] = commandArgumentsSchema.parse(process.argv.slice(2));
  const runtimeExecutable = nodeExecutable ?? process.execPath;
  const runtime = await runtimeVersion(runtimeExecutable);
  await mkdir(temporaryRoot, { recursive: true });
  const workspace = await mkdtemp(path.join(temporaryRoot, 'verify-package-'));
  try {
    const tarball = await packageProject(workspace);
    await inspectTarball(tarball, runtime);
    const consumer = await installConsumer(workspace, tarball);
    const evidence = await verifyCliConsumer(consumer, workspace, runtimeExecutable);
    const webEvidence = await verifyWebConsumer(consumer, runtimeExecutable);
    process.stdout.write(`Packed consumer verified: ${evidence.name} (${evidence.questionCount} question, ${evidence.answerCount} choices); ${webEvidence}.\n`);
  } finally {
    await rm(workspace, {
      force: true,
      recursive: true,
    });
  }
}

await main();

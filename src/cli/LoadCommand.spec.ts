import {
  access,
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { createFixtureSet } from '../data/question-set.fixture';
import { resolveProgressStoragePath } from './path';
import { runCli } from './main';
import { SqliteProgressStorage } from './sqlite';

class TerminalStream extends PassThrough { public readonly isTTY = true; }

let directory: string;
let priorXdgDataHome: string | undefined;

beforeEach(async () => {
  await mkdir('tmp', { recursive: true });
  directory = path.resolve(await mkdtemp('tmp/load-command-spec-'));
  priorXdgDataHome = process.env.XDG_DATA_HOME;
  process.env.XDG_DATA_HOME = directory;
});

afterEach(async () => {
  if (priorXdgDataHome === undefined) {
    Reflect.deleteProperty(process.env, 'XDG_DATA_HOME');
  } else {
    process.env.XDG_DATA_HOME = priorXdgDataHome;
  }
  await rm(directory, {
    recursive: true,
    force: true,
  });
});

async function writeQuestionFile(filename = 'replacement-set.json'): Promise<string> {
  const set = await createFixtureSet(3);
  const source = path.join(directory, filename);
  await writeFile(source, JSON.stringify(set.questions));
  return source;
}

async function seedProgress(): Promise<void> {
  const storage = await SqliteProgressStorage.open({ path: resolveProgressStoragePath() });
  try {
    const set = await createFixtureSet();
    await storage.commit({
      expectedRevision: 0,
      changes: [{
        kind: 'seedSet',
        set,
      }],
    });
    await storage.commit({
      expectedRevision: 1,
      changes: [{
        kind: 'putLearning',
        answer: {
          questionId: 1,
          answerIndices: [0],
          outcome: 'correctly_answered',
        },
      }],
    });
  } finally {
    storage.close();
  }
}

function nonInteractiveContext() {
  const input = new PassThrough();
  const output = new PassThrough();
  return {
    stdin: input,
    stdout: output,
    stderr: output,
  };
}

async function snapshot() {
  const storage = await SqliteProgressStorage.open({ path: resolveProgressStoragePath() });
  try {
    return await storage.load();
  } finally {
    storage.close();
  }
}

describe('load command', () => {
  it('rejects invalid files before creating progress storage', async () => {
    const invalid = path.join(directory, 'invalid.json');
    await writeFile(invalid, '{invalid json');

    const code = await runCli(['load', invalid], nonInteractiveContext());

    expect(code).not.toBe(0);
    await expect(access(resolveProgressStoragePath())).rejects.toThrow();
  });

  it('leaves saved progress unchanged when confirmation is unavailable on a non-terminal', async () => {
    await seedProgress();
    const source = await writeQuestionFile();

    const code = await runCli(['load', source], nonInteractiveContext());

    expect(code).not.toBe(0);
    const current = await snapshot();
    expect(current.currentSet?.questionCount).toBe(70);
    expect(current.learning).toHaveLength(1);
  });

  it('replaces saved progress without a prompt when --yes is supplied', async () => {
    await seedProgress();
    const source = await writeQuestionFile();

    const context = nonInteractiveContext();
    const code = await runCli(['load', source, '--yes'], context);

    expect(code).toBe(0);
    const summary = context.stdout.read()?.toString() ?? '';
    expect(summary).toContain('Loaded Replacement Set (3 questions).');
    expect(summary).toContain('Cleared 1 learning answer and 0 practice runs.');
    const current = await snapshot();
    expect(current.currentSet).toMatchObject({
      source: 'file',
      questionCount: 3,
    });
    expect(current.learning).toEqual([]);
    expect(current.runs).toEqual([]);
    expect(current.owners).toEqual([]);
  });

  it('cancels from a terminal confirmation without changing progress', async () => {
    await seedProgress();
    const source = await writeQuestionFile();
    const input = new TerminalStream();
    input.end('n\n');
    const output = new TerminalStream();

    const code = await runCli(['load', source], {
      stdin: input,
      stdout: output,
      stderr: output,
    });

    expect(code).not.toBe(0);
    const current = await snapshot();
    expect(current.currentSet?.questionCount).toBe(70);
    expect(current.learning).toHaveLength(1);
  });

  it('replaces saved progress after terminal confirmation', async () => {
    await seedProgress();
    const source = await writeQuestionFile();
    const input = new TerminalStream();
    input.end('y\n');
    const output = new TerminalStream();

    const code = await runCli(['load', source], {
      stdin: input,
      stdout: output,
      stderr: output,
    });

    expect(code).toBe(0);
    const current = await snapshot();
    expect(current.currentSet?.questionCount).toBe(3);
    expect(current.learning).toEqual([]);
  });

  it('resolves a relative path from the current working directory', async () => {
    const source = await writeQuestionFile('relative.json');
    const previousWorkingDirectory = process.cwd();
    process.chdir(directory);
    try {
      const code = await runCli(['load', path.basename(source), '--yes'], nonInteractiveContext());
      expect(code).toBe(0);
    } finally {
      process.chdir(previousWorkingDirectory);
    }

    expect((await snapshot()).currentSet?.questionCount).toBe(3);
  });
});

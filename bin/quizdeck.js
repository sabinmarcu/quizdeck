#!/usr/bin/env node
import { fileURLToPath } from 'node:url';

async function main() {
  const entry = new URL('../dist/cli/main.js', import.meta.url);
  let cli;
  try {
    cli = await import(entry.href);
  } catch (error) {
    if (!(error instanceof Error)
      || error.code !== 'ERR_MODULE_NOT_FOUND' || error.url !== entry.href) {
      throw error;
    }
    const repo = fileURLToPath(new URL('../', import.meta.url));
    process.stderr.write(`Quizdeck is not built. Run \`yarn build\` in ${repo}.\n`);
    return 1;
  }
  return cli.runCli();
}

process.exitCode = await main();

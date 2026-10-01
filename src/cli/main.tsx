import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  Builtins,
  Cli,
} from 'clipanion';
import type { RunContext } from 'clipanion';
import { InkCommand } from './InkCommand';
import { LoadCommand } from './LoadCommand';
import { WebCommand } from './WebCommand';

export async function runCli(
  argv: string[] = process.argv.slice(2),
  context?: RunContext,
): Promise<number> {
  const cli = new Cli({ binaryName: 'quizdeck' });
  cli.register(InkCommand);
  cli.register(LoadCommand);
  cli.register(WebCommand);
  cli.register(Builtins.HelpCommand);
  return context ? cli.run(argv, context) : cli.run(argv);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exitCode = await runCli();
}

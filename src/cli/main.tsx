import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  Builtins,
  Cli,
} from 'clipanion';
import { InkCommand } from './InkCommand';
import { WebCommand } from './WebCommand';

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const cli = new Cli({ binaryName: 'claude-certification' });
  cli.register(InkCommand);
  cli.register(WebCommand);
  cli.register(Builtins.HelpCommand);
  return cli.run(argv);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exitCode = await runCli();
}

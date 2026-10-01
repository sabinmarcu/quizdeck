import {
  ReadStream,
  WriteStream,
} from 'node:tty';
import {
  Command,
  UsageError,
} from 'clipanion';
import { render } from 'ink';
import type { Instance } from 'ink';
import {
  createAppSession,
  startupAtom,
} from '../state/application';
import { InkApp } from './InkApp';
import { openInkStorage } from './sqlite';

export class InkCommand extends Command {
  public static override paths = [Command.Default];

  public static override usage = Command.Usage({
    description: 'Open the interactive Claude certification terminal application.',
  });

  public async execute(): Promise<number> {
    if (!(this.context.stdin instanceof ReadStream)
      || !(this.context.stdout instanceof WriteStream)) {
      throw new UsageError('Ink requires an interactive terminal. Use `web` to serve the web build.');
    }
    const session = createAppSession(openInkStorage);
    let instance: Instance | undefined;
    try {
      instance = render(
        <InkApp session={session} onQuit={() => instance?.unmount()} />,
        {
          stdin: this.context.stdin,
          stdout: this.context.stdout,
          exitOnCtrlC: true,
        },
      );
      session.start();
      await instance.waitUntilExit();
      return session.store.get(startupAtom).status === 'error' ? 1 : 0;
    } finally {
      session.close();
      instance?.cleanup();
    }
  }
}

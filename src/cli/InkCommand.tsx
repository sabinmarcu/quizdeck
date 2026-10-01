import {
  ReadStream,
  WriteStream,
} from 'node:tty';
import {
  Command,
  UsageError,
} from 'clipanion';
import { render } from 'ink';
import type {
  Instance,
  SuspendTerminal,
  TerminalSuspension,
} from 'ink';
import {
  createAppSession,
  startupAtom,
} from '../state/application';
import { practiceOwnedAtom } from '../state/practice';
import { InkApp } from './InkApp';
import { openInkStorage } from './sqlite';

export class InkCommand extends Command {
  public static override paths = [Command.Default];

  public static override usage = Command.Usage({
    description: 'Open the interactive Quizdeck question-set study tool.',
  });

  public async execute(): Promise<number> {
    const { stdin, stdout } = this.context;
    if (!(stdin instanceof ReadStream) || !(stdout instanceof WriteStream)) {
      throw new UsageError('Ink requires an interactive terminal. Use `web` to serve the web build.');
    }
    const session = createAppSession(openInkStorage);
    let instance: Instance | undefined;
    let suspendTerminal: SuspendTerminal | null = null;
    let suspension: TerminalSuspension | undefined;
    let ending = false;
    let suspending = false;
    let failedExit = false;
    let resumeAfterSuspension = false;
    const registerTerminal = (suspend: SuspendTerminal | null) => { suspendTerminal = suspend; };
    const quit = async (forced = false) => {
      if (ending) {
        return;
      }
      ending = true;
      const saved = await session.practice.pause();
      if (!saved && !forced) {
        ending = false;
        return;
      }
      failedExit = !saved;
      instance?.unmount();
    };
    const interrupt = () => { quit(true); };
    const suspend = async () => {
      if (suspending || ending || process.platform === 'win32' || !suspendTerminal) {
        return;
      }
      suspending = true;
      resumeAfterSuspension = session.store.get(practiceOwnedAtom);
      if (!await session.practice.pause()) {
        suspending = false;
        return;
      }
      suspension = await suspendTerminal();
      process.kill(process.pid, 'SIGSTOP');
    };
    const continued = async () => {
      const previous = suspension;
      suspension = undefined;
      await previous?.resume();
      suspending = false;
      if (resumeAfterSuspension) {
        resumeAfterSuspension = false;
        await session.practice.resume();
      }
    };
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', interrupt);
    if (process.platform !== 'win32') {
      process.on('SIGTSTP', suspend);
      process.on('SIGCONT', continued);
    }
    try {
      instance = render(
        <InkApp
          session={session}
          onQuit={() => { quit(); }}
          onInterrupt={interrupt}
          onSuspend={() => { suspend(); }}
          onTerminalReady={registerTerminal}
        />,
        {
          stdin,
          stdout,
          exitOnCtrlC: false,
          kittyKeyboard: {
            // Request flags synchronously: auto-detection replays early input in Ink 7.1.1.
            mode: 'enabled',
            flags: ['disambiguateEscapeCodes', 'reportEventTypes'],
          },
        },
      );
      session.start();
      await instance.waitUntilExit();
      return failedExit || session.store.get(startupAtom).status === 'error' ? 1 : 0;
    } finally {
      process.off('SIGINT', interrupt);
      process.off('SIGTERM', interrupt);
      if (process.platform !== 'win32') {
        process.off('SIGTSTP', suspend);
        process.off('SIGCONT', continued);
      }
      await suspension?.resume();
      session.close();
      instance?.cleanup();
    }
  }
}

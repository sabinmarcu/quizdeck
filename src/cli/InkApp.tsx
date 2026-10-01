import { Provider } from 'jotai';
import {
  useApp,
  useInput,
} from 'ink';
import type { SuspendTerminal } from 'ink';
import { useEffect } from 'react';
import type { AppSession } from '../state/application';
import { InkShell } from './InkApp.Shell';

export namespace InkApp {
  export interface Props {
    session: AppSession;
    onQuit(): void;
    onInterrupt(): void;
    onSuspend(): void;
    onTerminalReady(suspend: SuspendTerminal | null): void;
  }
}

export function InkApp({
  session, onQuit, onInterrupt, onSuspend, onTerminalReady,
}: InkApp.Props) {
  const { suspendTerminal } = useApp();
  useEffect(() => {
    onTerminalReady(suspendTerminal);
    return () => { onTerminalReady(null); };
  }, [onTerminalReady, suspendTerminal]);
  useInput((input, key) => {
    if (!key.ctrl || key.eventType === 'release' || key.eventType === 'repeat') {
      return;
    }
    if (input === 'c') {
      onInterrupt();
    } else if (input === 'z') {
      onSuspend();
    }
  });
  return (
    <Provider store={session.store}>
      <InkShell session={session} onQuit={onQuit} />
    </Provider>
  );
}

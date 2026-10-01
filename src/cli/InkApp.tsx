import { Provider } from 'jotai';
import type { AppSession } from '../state/application';
import { InkShell } from './InkApp.Shell';

export namespace InkApp {
  export interface Props { session: AppSession; onQuit(): void }
}

export function InkApp({ session, onQuit }: InkApp.Props) {
  return (
    <Provider store={session.store}>
      <InkShell session={session} onQuit={onQuit} />
    </Provider>
  );
}

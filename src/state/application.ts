import {
  atom,
  createStore,
} from 'jotai';
import type { Store } from 'jotai/vanilla';
import { loadBundledBank } from '../data/bank';
import type { Bank } from '../data/bank';
import type { Snapshot } from '../data/records';
import { StorageConflictError } from '../data/storage';
import type {
  ProgressStorage,
  StorageChange,
} from '../data/storage';

export type Startup =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
    status: 'ready';
    bank: Bank;
    banks: ReadonlyMap<string, Bank>;
    snapshot: Snapshot;
    location: string;
    retention: ProgressStorage['retention'];
  };

export interface BankInfo {
  questionCount: number;
  answerCount: number;
  missingExplanationCount: number;
}

export interface AppSession {
  store: Store;
  start(): Promise<void>;
  close(): void;
}

export const startupAtom = atom<Startup>({ status: 'loading' });
export const pendingAtom = atom(false);
export const actionErrorAtom = atom<string | null>(null);
const storageAtom = atom<ProgressStorage | null>(null);
const bankAtom = atom((get) => {
  const startup = get(startupAtom);
  return startup.status === 'ready' ? startup.bank : null;
});
export const bankInfoAtom = atom<BankInfo | null>((get) => {
  const bank = get(bankAtom);
  if (!bank) {
    return null;
  }
  return {
    questionCount: bank.questions.length,
    answerCount: bank.questions.reduce((count, question) => count + question.answers.length, 0),
    missingExplanationCount: bank.questions.reduce(
      (count, question) => count
        + question.answers.filter((answer) => !answer.justification).length,
      0,
    ),
  };
});

export const commitAtom = atom(null, async (get, set, changes: StorageChange[]) => {
  const storage = get(storageAtom);
  const startup = get(startupAtom);
  if (!storage || startup.status !== 'ready' || get(pendingAtom)) {
    throw new Error('Storage is not ready for another save');
  }
  set(pendingAtom, true);
  set(actionErrorAtom, null);
  try {
    const snapshot = await storage.commit({
      expectedRevision: startup.snapshot.revision,
      changes,
    });
    const latest = get(startupAtom);
    if (latest.status === 'ready' && snapshot.revision >= latest.snapshot.revision) {
      set(startupAtom, {
        ...latest,
        banks: new Map([
          ...latest.banks,
          ...changes.flatMap((change) => (change.kind === 'putBank'
            ? [[change.bank.version, change.bank] as const]
            : [])),
        ]),
        snapshot,
      });
    }
    return snapshot;
  } catch (error) {
    set(actionErrorAtom, error instanceof Error ? error.message : 'Progress could not be saved');
    throw error;
  } finally {
    set(pendingAtom, false);
  }
});

async function loadSavedBanks(storage: ProgressStorage, snapshot: Snapshot) {
  const banks = new Map<string, Bank>();
  for (const entry of snapshot.banks) {
    const bank = await storage.getBank(entry.version);
    if (!bank) {
      throw new Error('A saved question bank is unavailable. Progress was not reset.');
    }
    banks.set(entry.version, bank);
  }
  return banks;
}

export function createAppSession(openStorage: () => Promise<ProgressStorage>): AppSession {
  const store = createStore();
  let storage: ProgressStorage | undefined;
  let unsubscribe: (() => void) | undefined;
  let closed = false;
  let initialization: Promise<void> | undefined;
  let refreshVersion = 0;

  const forgetStorage = () => {
    unsubscribe?.();
    unsubscribe = undefined;
    storage?.close();
    storage = undefined;
    store.set(storageAtom, null);
  };

  const refresh = async () => {
    refreshVersion += 1;
    const version = refreshVersion;
    const current = store.get(startupAtom);
    if (!storage || current.status !== 'ready') {
      return;
    }
    try {
      const snapshot = await storage.load();
      const banks = await loadSavedBanks(storage, snapshot);
      const latest = store.get(startupAtom);
      if (!closed && version === refreshVersion && latest.status === 'ready'
        && snapshot.revision >= latest.snapshot.revision) {
        store.set(startupAtom, {
          ...latest,
          banks,
          snapshot,
        });
      }
    } catch (error) {
      if (!closed && version === refreshVersion) {
        forgetStorage();
        store.set(startupAtom, {
          status: 'error',
          message: error instanceof Error ? error.message : 'Persisted progress could not be loaded',
        });
      }
    }
  };

  return {
    store,
    start() {
      if (closed) {
        return Promise.reject(new Error('Application session is closed'));
      }
      initialization ??= (async () => {
        store.set(startupAtom, { status: 'loading' });
        store.set(actionErrorAtom, null);
        try {
          const bank = await loadBundledBank();
          storage ??= await openStorage();
          if (closed) {
            storage.close();
            return;
          }
          let snapshot = await storage.load();
          if (snapshot.banks.every((entry) => entry.version !== bank.version)) {
            try {
              snapshot = await storage.commit({
                expectedRevision: snapshot.revision,
                changes: [{
                  kind: 'putBank',
                  bank,
                }],
              });
            } catch (error) {
              if (!(error instanceof StorageConflictError)) {
                throw error;
              }
              snapshot = await storage.load();
              if (snapshot.banks.every((entry) => entry.version !== bank.version)) {
                throw error;
              }
            }
          }
          const banks = await loadSavedBanks(storage, snapshot);
          if (!closed) {
            store.set(storageAtom, storage);
            store.set(startupAtom, {
              status: 'ready',
              bank,
              banks,
              snapshot,
              location: storage.location,
              retention: storage.retention,
            });
            unsubscribe ??= storage.subscribe(() => { refresh(); });
          }
        } catch (error) {
          if (!closed) {
            forgetStorage();
            store.set(startupAtom, {
              status: 'error',
              message: error instanceof Error ? error.message : 'Application startup failed',
            });
          }
        } finally {
          initialization = undefined;
        }
      })();
      return initialization;
    },
    close() {
      closed = true;
      refreshVersion += 1;
      forgetStorage();
    },
  };
}

import {
  atom,
  createStore,
} from 'jotai';
import type { Store } from 'jotai/vanilla';
import { createDemoSet } from '../data/demo';
import type { QuestionSet } from '../data/question-set';
import type { parseQuestionSet } from '../data/question-set-file';
import type { Snapshot } from '../data/records';
import { StorageConflictError } from '../data/storage';
import type {
  ProgressStorage,
  StorageChange,
} from '../data/storage';
import { resetLearningStateAtom } from './learning-state';
import {
  createPracticeController,
  preparePracticeReplacementAtom,
  reconcilePracticeAtom,
} from './practice-session';
import type { PracticeController } from './practice-session';

export type Startup =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
    status: 'ready';
    set: QuestionSet;
    snapshot: Snapshot;
    location: string;
    retention: ProgressStorage['retention'];
  };

export interface SetInfo {
  questionCount: number;
  answerCount: number;
  missingExplanationCount: number;
}

export interface AppSession {
  store: Store;
  practice: PracticeController;
  start(): Promise<void>;
  close(): void;
}

export const startupAtom = atom<Startup>({ status: 'loading' });
export const pendingAtom = atom(false);
export const actionErrorAtom = atom<string | null>(null);
const storageAtom = atom<ProgressStorage | null>(null);
const writeBusyAtom = atom(false);
const currentSetAtom = atom((get) => {
  const startup = get(startupAtom);
  return startup.status === 'ready' ? startup.set : null;
});
export const setInfoAtom = atom<SetInfo | null>((get) => {
  const currentSet = get(currentSetAtom);
  if (!currentSet) {
    return null;
  }
  return {
    questionCount: currentSet.questionCount,
    answerCount: currentSet.questions.reduce((count, { answers }) => count + answers.length, 0),
    missingExplanationCount: currentSet.questions.reduce(
      (count, question) => count + (question.justification
        ? 0
        : question.answers.reduce((missing, answer) => missing + Number(!answer.justification), 0)),
      0,
    ),
  };
});

function requireCurrentSet(snapshot: Snapshot): QuestionSet {
  if (!snapshot.currentSet) {
    throw new Error('The saved question set is unavailable. Progress was not reset.');
  }
  return snapshot.currentSet;
}

function setIdentityChanged(previous: QuestionSet, next: QuestionSet) {
  return previous.contentHash !== next.contentHash || previous.loadedAt !== next.loadedAt;
}

const publishProgressAtom = atom(null, (get, set, snapshot: Snapshot) => {
  const current = get(startupAtom);
  if (current.status !== 'ready' || snapshot.revision < current.snapshot.revision) {
    return false;
  }
  const currentSet = requireCurrentSet(snapshot);
  const replaced = setIdentityChanged(current.set, currentSet);
  set(startupAtom, {
    ...current,
    set: currentSet,
    snapshot,
  });
  if (replaced) {
    set(resetLearningStateAtom);
  }
  return set(reconcilePracticeAtom, snapshot) || replaced;
});

export const commitAtom = atom(null, async (get, set, changes: StorageChange[]) => {
  const storage = get(storageAtom);
  const startup = get(startupAtom);
  if (!storage || startup.status !== 'ready' || get(writeBusyAtom)) {
    throw new Error('Storage is not ready for another save');
  }
  set(pendingAtom, true);
  set(writeBusyAtom, true);
  set(actionErrorAtom, null);
  try {
    if (changes.some((change) => change.kind === 'replaceSet')) {
      await set(preparePracticeReplacementAtom);
    }
    const snapshot = await storage.commit({
      expectedRevision: startup.snapshot.revision,
      changes,
    });
    set(publishProgressAtom, snapshot);
    return snapshot;
  } catch (error) {
    set(actionErrorAtom, error instanceof Error ? error.message : 'Progress could not be saved');
    throw error;
  } finally {
    set(pendingAtom, false);
    set(writeBusyAtom, false);
  }
});

export const loadQuestionSetAtom = atom(null, async (get, set, input: parseQuestionSet.Result) => {
  try {
    const startup = get(startupAtom);
    if (startup.status !== 'ready') {
      throw new Error('Progress storage is not ready to load a question set.');
    }
    await set(commitAtom, [{
      kind: 'replaceSet',
      set: {
        ...input,
        source: 'file',
        loadedAt: Math.max(Date.now(), startup.set.loadedAt + 1),
      },
    }]);
    return true;
  } catch (error) {
    set(actionErrorAtom, error instanceof Error ? error.message : 'The question set could not be loaded.');
    return false;
  }
});

export const refreshProgressAtom = atom(null, async (get, set) => {
  const storage = get(storageAtom);
  const current = get(startupAtom);
  if (!storage || current.status !== 'ready') {
    throw new Error('Progress storage is not ready.');
  }
  const snapshot = await storage.load();
  set(publishProgressAtom, snapshot);
  return snapshot;
});

export type ProgressMutation = (snapshot: Snapshot) => StorageChange[];

export const mutateProgressAtom = atom(null, async (
  get,
  set,
  build: ProgressMutation,
  // Heartbeats persist quietly; user actions retain the visible save/error lifecycle.
  background = false,
) => {
  const storage = get(storageAtom);
  const current = get(startupAtom);
  if (!storage || current.status !== 'ready' || get(writeBusyAtom)) {
    throw new Error('Progress storage is busy or unavailable.');
  }
  set(writeBusyAtom, true);
  if (!background) {
    set(pendingAtom, true);
    set(actionErrorAtom, null);
  }
  try {
    const loaded = await storage.load();
    if (set(publishProgressAtom, loaded)) {
      return loaded;
    }
    const changes = build(loaded);
    const snapshot = changes.length === 0
      ? loaded
      : await storage.commit({
        expectedRevision: loaded.revision,
        changes,
      });
    set(publishProgressAtom, snapshot);
    return snapshot;
  } catch (error) {
    if (error instanceof StorageConflictError) {
      const latest = await storage.load();
      if (set(publishProgressAtom, latest)) {
        return latest;
      }
    }
    set(actionErrorAtom, error instanceof Error ? error.message : 'Progress could not be saved.');
    throw error;
  } finally {
    set(writeBusyAtom, false);
    if (!background) {
      set(pendingAtom, false);
    }
  }
});

export namespace createAppSession {
  export interface Options {
    practice?: createPracticeController.Options;
  }
}

export function createAppSession(
  openStorage: () => Promise<ProgressStorage>,
  // Runtime clock injection is session-local, never a persisted application setting.
  options: createAppSession.Options = {},
): AppSession {
  const store = createStore();
  const practice = createPracticeController(store, {
    read: () => {
      const current = store.get(startupAtom);
      return current.status === 'ready' ? current : null;
    },
    mutate: (build, background) => store.set(mutateProgressAtom, build, background),
    refresh: () => store.set(refreshProgressAtom),
    onError: (message) => { store.set(actionErrorAtom, message); },
  }, options.practice);
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
      if (!closed && version === refreshVersion) {
        store.set(publishProgressAtom, snapshot);
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
    practice,
    start() {
      if (closed) {
        return Promise.reject(new Error('Application session is closed'));
      }
      initialization ??= (async () => {
        store.set(startupAtom, { status: 'loading' });
        store.set(actionErrorAtom, null);
        try {
          storage ??= await openStorage();
          if (closed) {
            storage.close();
            return;
          }
          let snapshot = await storage.load();
          if (snapshot.currentSet === null) {
            try {
              snapshot = await storage.commit({
                expectedRevision: snapshot.revision,
                changes: [{
                  kind: 'seedSet',
                  set: await createDemoSet(Date.now()),
                }],
              });
            } catch (error) {
              if (!(error instanceof StorageConflictError)) {
                throw error;
              }
              snapshot = await storage.load();
              if (snapshot.currentSet === null) {
                throw error;
              }
            }
          }
          if (!closed) {
            store.set(storageAtom, storage);
            store.set(startupAtom, {
              status: 'ready',
              set: requireCurrentSet(snapshot),
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
      practice.dispose();
      closed = true;
      refreshVersion += 1;
      forgetStorage();
    },
  };
}

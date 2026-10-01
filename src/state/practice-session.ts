import { atom } from 'jotai';
import type { Store } from 'jotai/vanilla';
import { z } from 'zod';
import type { QuestionSet } from '../data/question-set';
import {
  answerPracticeRun,
  createPracticeRun,
} from '../data/practice';
import type {
  PracticeRun,
  Snapshot,
} from '../data/records';
import type { StorageChange } from '../data/storage';

export interface PracticePersistence {
  read(): { set: QuestionSet; snapshot: Snapshot } | null;
  mutate(build: (snapshot: Snapshot) => StorageChange[], background?: boolean): Promise<Snapshot>;
  refresh(): Promise<Snapshot>;
  onError(message: string): void;
}
export const practiceSelectedIdAtom = atom<string | null>(null);
export const practiceOwnedAtom = atom(false);
export const practiceBusyAtom = atom(false);
export const practiceElapsedAtom = atom(0);
export const practiceErrorAtom = atom<string | null>(null);
export const practiceNoticeAtom = atom<string | null>(null);
const controllerAtom = atom<PracticeController | null>(null);
const leaseMs = 5000;

export interface PracticeAnswerInput {
  runId: string;
  position: number;
  answerIndex: number;
}
export interface PracticeController {
  start(): Promise<boolean>;
  open(runId: string): Promise<boolean>;
  answer(input: PracticeAnswerInput): Promise<boolean>;
  view(position: number): Promise<boolean>;
  pause(): Promise<boolean>;
  resume(): Promise<boolean>;
  leave(): Promise<boolean>;
  checkpoint(): Promise<boolean>;
  refresh(): Promise<boolean>;
  reconcile(snapshot: Snapshot): boolean;
  prepareReplacement(): Promise<void>;
  dispose(): void;
}
export namespace createPracticeController {
  export interface Options {
    now?: () => number;
    monotonic?: () => number;
    ownerId?: string;
    automaticCheckpoints?: boolean;
  }
}

const runFrom = (snapshot: Snapshot, id: string) => {
  const run = snapshot.runs.find((entry) => entry.id === id);
  if (!run || run.status === 'completed') {
    throw new Error('That run is unavailable for practice interaction.');
  }
  return run;
};
export function createPracticeController(
  store: Store,
  persistence: PracticePersistence,
  options: createPracticeController.Options = {},
): PracticeController {
  const now = options.now ?? Date.now;
  const monotonic = options.monotonic ?? (() => performance.now());
  const ownerId = options.ownerId ?? crypto.randomUUID();
  let activeId: string | null = null;
  let intervalStart = 0;
  let intervalBase = 0;
  let frozenElapsed: number | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let disposed = false;
  let chain: Promise<unknown> = Promise.resolve();
  let tickQueued = false;

  const elapsed = () => frozenElapsed
    ?? intervalBase + Math.max(0, monotonic() - intervalStart);
  const clearTimer = () => {
    if (timer === undefined) {
      return;
    }

    clearInterval(timer);
    timer = undefined;
  };
  const freeze = () => {
    if (activeId !== null && frozenElapsed === null) {
      frozenElapsed = elapsed();
      store.set(practiceElapsedAtom, frozenElapsed);
    }
    clearTimer();
    store.set(practiceOwnedAtom, false);
  };
  const reconcile = (snapshot: Snapshot) => {
    const selectedId = store.get(practiceSelectedIdAtom);
    if ((activeId === null || snapshot.runs.some((run) => run.id === activeId))
      && (selectedId === null || snapshot.runs.some((run) => run.id === selectedId))) {
      return false;
    }
    clearTimer();
    activeId = null;
    frozenElapsed = null;
    intervalBase = 0;
    store.set(practiceSelectedIdAtom, null);
    store.set(practiceOwnedAtom, false);
    store.set(practiceElapsedAtom, 0);
    store.set(practiceErrorAtom, null);
    store.set(practiceNoticeAtom, 'The question set was replaced. Practice returned to history.');
    return true;
  };
  const fail = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Practice progress could not be saved.';
    store.set(practiceErrorAtom, message);
    persistence.onError(message);
  };
  const guardedChanges = (run: PracticeRun, at: number, release = false): StorageChange[] => [
    {
      kind: 'acquireOwner',
      owner: {
        runId: run.id,
        ownerId,
        expiresAt: at + leaseMs,
      },
      now: at,
    },
    {
      kind: 'putRun',
      run,
      guard: {
        ownerId,
        now: at,
      },
    },
    ...(release
      ? [{
        kind: 'releaseOwner',
        runId: run.id,
        ownerId,
      } as const]
      : []),
  ];
  const enqueue = (work: () => Promise<boolean>) => {
    const predecessor = chain;
    const operation = (async () => {
      try {
        await predecessor;
      } catch {
        // A failed operation must not prevent a later explicit retry.
      }
      return work();
    })();
    chain = operation;
    return operation;
  };
  const userAction = (work: () => Promise<boolean>) => {
    if (disposed || store.get(practiceBusyAtom)) {
      return Promise.resolve(false);
    }
    store.set(practiceBusyAtom, true);
    store.set(practiceErrorAtom, null);
    return enqueue(async () => {
      try {
        return await work();
      } catch (error) {
        if (store.get(practiceNoticeAtom) !== null
          && store.get(practiceSelectedIdAtom) === null) {
          return false;
        }
        fail(error);
        return false;
      } finally {
        store.set(practiceBusyAtom, false);
      }
    });
  };
  const checkpoint = () => {
    if (disposed || activeId === null || frozenElapsed !== null || tickQueued) {
      return Promise.resolve(true);
    }
    tickQueued = true;
    return enqueue(async () => {
      try {
        if (activeId === null || frozenElapsed !== null) {
          return true;
        }
        const id = activeId;
        const at = now();
        const duration = elapsed();
        const snapshot = await persistence.mutate((current) => {
          const run = runFrom(current, id);
          return guardedChanges({
            ...run,
            elapsedMs: Math.max(run.elapsedMs, duration),
          }, at);
        }, true);
        const saved = snapshot.runs.find((run) => run.id === id);
        if (!saved) {
          reconcile(snapshot);
          return true;
        }
        store.set(practiceElapsedAtom, saved.elapsedMs);
        return true;
      } catch (error) {
        freeze();
        fail(error);
        return false;
      } finally {
        tickQueued = false;
      }
    });
  };
  const beginInterval = (run: PracticeRun) => {
    activeId = run.id;
    intervalBase = run.elapsedMs;
    intervalStart = monotonic();
    frozenElapsed = null;
    store.set(practiceElapsedAtom, run.elapsedMs);
    store.set(practiceOwnedAtom, true);
    if (options.automaticCheckpoints !== false) {
      clearTimer();
      timer = setInterval(() => { checkpoint(); }, 1000);
    }
  };
  const persistPause = async () => {
    if (activeId === null) {
      return true;
    }
    freeze();
    const id = activeId;
    const duration = elapsed();
    const at = now();
    const startup = persistence.read();
    if (startup !== null
      && startup.snapshot.runs.find((run) => run.id === id)?.status === 'completed') {
      activeId = null;
      return true;
    }
    await persistence.mutate((snapshot) => {
      const run = runFrom(snapshot, id);
      return guardedChanges({
        ...run,
        status: 'paused',
        elapsedMs: Math.max(run.elapsedMs, duration),
      }, at, true);
    });
    activeId = null;
    frozenElapsed = null;
    return true;
  };
  const resumeSelected = async () => {
    const id = store.get(practiceSelectedIdAtom);
    if (!id) {
      throw new Error('Select a practice run to resume.');
    }
    if (activeId === id && store.get(practiceOwnedAtom)) {
      return true;
    }
    await persistPause();
    if (store.get(practiceSelectedIdAtom) !== id) {
      return false;
    }
    const at = now();
    const snapshot = await persistence.mutate((current) => {
      const run = runFrom(current, id);
      return guardedChanges({
        ...run,
        status: 'active',
      }, at);
    });
    const saved = snapshot.runs.find((run) => run.id === id);
    if (!saved) {
      reconcile(snapshot);
      return false;
    }
    beginInterval(saved);
    return true;
  };

  const controller: PracticeController = {
    start: () => userAction(async () => {
      store.set(practiceNoticeAtom, null);
      await persistPause();
      const startup = persistence.read();
      if (startup === null) {
        throw new Error('Load progress storage before starting practice.');
      }
      const run = createPracticeRun(startup.set, crypto.randomUUID(), now());
      const saved = await persistence.mutate(() => [
        {
          kind: 'putRun',
          run,
        },
        {
          kind: 'acquireOwner',
          owner: {
            runId: run.id,
            ownerId,
            expiresAt: now() + leaseMs,
          },
          now: now(),
        },
      ]);
      const committed = saved.runs.find((entry) => entry.id === run.id);
      if (!committed) {
        reconcile(saved);
        return false;
      }
      store.set(practiceNoticeAtom, null);
      store.set(practiceSelectedIdAtom, committed.id);
      beginInterval(committed);
      return true;
    }),
    open: (runId) => userAction(async () => {
      await persistPause();
      await persistence.refresh();
      const startup = persistence.read();
      const run = startup?.snapshot.runs.find((entry) => entry.id === runId);
      if (!run) {
        if (store.get(practiceNoticeAtom) !== null) {
          return false;
        }
        throw new Error('That saved practice run was not found.');
      }
      store.set(practiceSelectedIdAtom, run.id);
      store.set(practiceNoticeAtom, null);
      if (run.status === 'completed') {
        return true;
      }
      return resumeSelected();
    }),
    answer: (input) => userAction(async () => {
      const validated = z.strictObject({
        runId: z.string().min(1),
        position: z.number().int().nonnegative(),
        answerIndex: z.number().int().nonnegative(),
      }).parse(input);
      if (activeId !== validated.runId || !store.get(practiceOwnedAtom)) {
        throw new Error('Resume this practice run before answering.');
      }
      const at = now();
      const duration = elapsed();
      const snapshot = await persistence.mutate((current) => {
        const run = runFrom(current, validated.runId);
        if (!current.currentSet || validated.position >= run.questionIds.length) {
          throw new Error('The saved practice question is unavailable.');
        }
        const next = answerPracticeRun(run, current.currentSet, {
          ...validated,
          elapsedMs: duration,
          now: at,
        });
        return guardedChanges(next, at, next.status === 'completed');
      });
      const saved = snapshot.runs.find((run) => run.id === validated.runId);
      if (!saved) {
        reconcile(snapshot);
        return false;
      }
      store.set(practiceElapsedAtom, saved.elapsedMs);
      if (saved.status === 'completed') {
        clearTimer();
        activeId = null;
        frozenElapsed = null;
        store.set(practiceOwnedAtom, false);
      }
      return true;
    }),
    view: (position) => userAction(async () => {
      if (!Number.isInteger(position) || activeId === null || !store.get(practiceOwnedAtom)) {
        throw new Error('Resume practice before navigating its questions.');
      }
      const id = activeId;
      const at = now();
      const duration = elapsed();
      await persistence.mutate((snapshot) => {
        const run = runFrom(snapshot, id);
        if (position < 0 || position > run.nextUnanswered || position >= run.questionIds.length) {
          throw new Error('Only answered questions and the next unanswered question are accessible.');
        }
        return guardedChanges({
          ...run,
          viewedPosition: position,
          elapsedMs: Math.max(run.elapsedMs, duration),
        }, at);
      });
      return true;
    }),
    pause: () => {
      freeze();
      return enqueue(async () => {
        try {
          return await persistPause();
        } catch (error) {
          fail(error);
          return false;
        }
      });
    },
    resume: () => userAction(resumeSelected),
    leave: () => {
      if (disposed || store.get(practiceBusyAtom)) {
        return Promise.resolve(false);
      }
      freeze();
      return userAction(async () => {
        await persistPause();
        store.set(practiceSelectedIdAtom, null);
        return true;
      });
    },
    checkpoint,
    refresh: () => userAction(async () => { await persistence.refresh(); return true; }),
    reconcile,
    prepareReplacement: async () => {
      freeze();
      await enqueue(async () => true);
    },
    dispose: () => {
      disposed = true;
      freeze();
      store.set(controllerAtom, null);
    },
  };
  store.set(controllerAtom, controller);
  return controller;
}
export const startPracticeAtom = atom(null, (get) => (
  get(controllerAtom)?.start() ?? Promise.resolve(false)
));
export const openPracticeAtom = atom(null, (get, _set, runId: string) => (
  get(controllerAtom)?.open(runId) ?? Promise.resolve(false)
));
export const answerPracticeAtom = atom(null, (get, _set, input: PracticeAnswerInput) => (
  get(controllerAtom)?.answer(input) ?? Promise.resolve(false)
));
export const viewPracticeAtom = atom(null, (get, _set, position: number) => (
  get(controllerAtom)?.view(position) ?? Promise.resolve(false)
));
export const pausePracticeAtom = atom(null, (get) => (
  get(controllerAtom)?.pause() ?? Promise.resolve(false)
));
export const resumePracticeAtom = atom(null, (get) => (
  get(controllerAtom)?.resume() ?? Promise.resolve(false)
));
export const leavePracticeAtom = atom(null, (get) => (
  get(controllerAtom)?.leave() ?? Promise.resolve(false)
));
export const refreshPracticeAtom = atom(null, (get) => (
  get(controllerAtom)?.refresh() ?? Promise.resolve(false)
));
export const reconcilePracticeAtom = atom(null, (get, _set, snapshot: Snapshot) => (
  get(controllerAtom)?.reconcile(snapshot) ?? false
));
export const preparePracticeReplacementAtom = atom(null, async (get) => {
  await get(controllerAtom)?.prepareReplacement();
});

import {
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import type { QuestionSet } from './question-set';
import { createFixtureSet } from './question-set.fixture';
import { emptySnapshot } from './records';
import type {
  PracticeRun,
  Snapshot,
} from './records';
import {
  applyTransaction,
  StorageConflictError,
} from './storage';

let set: QuestionSet;
let replacementSet: QuestionSet;

beforeAll(async () => {
  [set, replacementSet] = await Promise.all([
    createFixtureSet(3),
    createFixtureSet(2),
  ]);
});

function activeSnapshot(): Snapshot {
  const run: PracticeRun = {
    id: 'run-1',
    createdAt: 10,
    completedAt: null,
    status: 'active',
    questionIds: [1, 2, 3],
    answers: [{
      questionId: 1,
      answerIndex: 1,
      outcome: 'incorrectly_answered',
    }],
    nextUnanswered: 1,
    viewedPosition: 1,
    elapsedMs: 500,
    result: null,
  };
  return {
    ...emptySnapshot(),
    revision: 5,
    currentSet: set,
    runs: [run],
    owners: [{
      runId: run.id,
      ownerId: 'session-a',
      expiresAt: 1000,
    }],
    learning: [{
      questionId: 1,
      answerIndex: 1,
      outcome: 'incorrectly_answered',
    }],
  };
}

describe('transaction revision and ownership', () => {
  it('seeds only an empty snapshot and treats duplicate or overwrite seeding as a conflict', () => {
    const seeded = applyTransaction(emptySnapshot(), {
      expectedRevision: 0,
      changes: [{
        kind: 'seedSet',
        set,
      }],
    });
    expect(seeded.currentSet).toEqual(set);
    expect(() => applyTransaction(seeded, {
      expectedRevision: 1,
      changes: [{
        kind: 'seedSet',
        set,
      }],
    })).toThrow(StorageConflictError);
    expect(() => applyTransaction(emptySnapshot(), {
      expectedRevision: 0,
      changes: [
        {
          kind: 'seedSet',
          set,
        },
        {
          kind: 'seedSet',
          set,
        },
      ],
    })).toThrow(StorageConflictError);
  });

  it('rejects a stale revision without modifying the caller snapshot', () => {
    const before = activeSnapshot();
    expect(() => applyTransaction(before, {
      expectedRevision: 4,
      changes: [{ kind: 'clearLearning' }],
    })).toThrow(StorageConflictError);
    expect(before.learning[0]!.outcome).toBe('incorrectly_answered');
    expect(before.revision).toBe(5);
  });

  it('clears learning without changing saved practice or timing', () => {
    const before = activeSnapshot();
    const after = applyTransaction(before, {
      expectedRevision: 5,
      changes: [{ kind: 'clearLearning' }],
    });
    expect(after.learning).toEqual([]);
    expect(after.runs).toEqual(before.runs);
    expect(after.owners).toEqual(before.owners);
    expect(after.revision).toBe(6);
    expect(before.learning[0]!.questionId).toBe(1);
  });

  it('replaces the set and clears all progress despite live practice ownership', () => {
    const before = activeSnapshot();
    const after = applyTransaction(before, {
      expectedRevision: before.revision,
      changes: [{
        kind: 'replaceSet',
        set: replacementSet,
      }],
    });

    expect(after).toMatchObject({
      revision: 6,
      currentSet: replacementSet,
      learning: [],
      runs: [],
      owners: [],
    });
    expect(before).toMatchObject({
      revision: 5,
      currentSet: set,
      learning: [{ questionId: 1 }],
      runs: [{ id: 'run-1' }],
      owners: [{ runId: 'run-1' }],
    });
  });

  it('resets progress when a file with the current content is loaded again', () => {
    const before = activeSnapshot();
    const after = applyTransaction(before, {
      expectedRevision: before.revision,
      changes: [{
        kind: 'replaceSet',
        set,
      }],
    });

    expect(after).toMatchObject({
      revision: 6,
      currentSet: set,
      learning: [],
      runs: [],
      owners: [],
    });
  });

  it('preserves the previous set and progress when replacement validation fails', () => {
    const before = activeSnapshot();
    const original = structuredClone(before);

    expect(() => applyTransaction(before, {
      expectedRevision: before.revision,
      changes: [{
        kind: 'replaceSet',
        set: {
          ...replacementSet,
          source: 'demo',
        },
      }],
    })).toThrow('Replacement question sets must come from a file');
    expect(before).toEqual(original);
  });

  it('rejects combinations that could repopulate replacement-cleared records', () => {
    const before = activeSnapshot();
    const original = structuredClone(before);

    expect(() => applyTransaction(before, {
      expectedRevision: before.revision,
      changes: [
        {
          kind: 'replaceSet',
          set: replacementSet,
        },
        {
          kind: 'putLearning',
          answer: {
            questionId: 1,
            answerIndex: 1,
            outcome: 'incorrectly_answered',
          },
        },
      ],
    })).toThrow('cannot be combined');
    expect(before).toEqual(original);
  });

  it('rejects an active owner takeover and allows takeover after expiry', () => {
    const before = activeSnapshot();
    const owner = {
      runId: 'run-1',
      ownerId: 'session-b',
      expiresAt: 2000,
    };
    expect(() => applyTransaction(before, {
      expectedRevision: 5,
      changes: [{
        kind: 'acquireOwner',
        owner,
        now: 100,
      }],
    })).toThrow(StorageConflictError);
    const after = applyTransaction(before, {
      expectedRevision: 5,
      changes: [{
        kind: 'acquireOwner',
        owner,
        now: 1000,
      }],
    });
    expect(after.owners[0]!.ownerId).toBe('session-b');
    expect(after.runs[0]!.elapsedMs).toBe(500);
  });

  it('requires the current owner and preserves saved answers, order, and elapsed time', () => {
    const before = activeSnapshot();
    const run = before.runs[0]!;
    expect(() => applyTransaction(before, {
      expectedRevision: 5,
      changes: [{
        kind: 'putRun',
        run: {
          ...run,
          elapsedMs: 600,
        },
      }],
    })).toThrow(StorageConflictError);
    expect(() => applyTransaction(before, {
      expectedRevision: 5,
      changes: [{
        kind: 'putRun',
        guard: {
          ownerId: 'session-a',
          now: 100,
        },
        run: {
          ...run,
          questionIds: [1, 3, 2],
        },
      }],
    })).toThrow('cannot be rewritten');
    expect(() => applyTransaction(before, {
      expectedRevision: 5,
      changes: [{
        kind: 'putRun',
        guard: {
          ownerId: 'session-a',
          now: 100,
        },
        run: {
          ...run,
          answers: [{
            questionId: 1,
            answerIndex: 0,
            outcome: 'correctly_answered',
          }],
          elapsedMs: 499,
        },
      }],
    })).toThrow('cannot be rewritten');
  });

  it('commits pause and ownership release together but rejects the partial state', () => {
    const before = activeSnapshot();
    const paused = {
      ...before.runs[0]!,
      status: 'paused' as const,
      elapsedMs: 900,
    };
    expect(() => applyTransaction(before, {
      expectedRevision: 5,
      changes: [{
        kind: 'putRun',
        run: paused,
        guard: {
          ownerId: 'session-a',
          now: 100,
        },
      }],
    })).toThrow('active');
    const after = applyTransaction(before, {
      expectedRevision: 5,
      changes: [
        {
          kind: 'putRun',
          run: paused,
          guard: {
            ownerId: 'session-a',
            now: 100,
          },
        },
        {
          kind: 'releaseOwner',
          runId: 'run-1',
          ownerId: 'session-a',
        },
      ],
    });
    expect(after.runs[0]!.status).toBe('paused');
    expect(after.runs[0]!.elapsedMs).toBe(900);
    expect(after.owners).toEqual([]);
    expect(before.runs[0]!.status).toBe('active');
  });
});

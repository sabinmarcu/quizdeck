import { createHash } from 'node:crypto';
import {
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { validateBank } from './bank';
import type { Bank } from './bank';
import { emptySnapshot } from './records';
import type {
  PracticeRun,
  Snapshot,
} from './records';
import {
  applyTransaction,
  StorageConflictError,
} from './storage';

let bank: Bank;
let banks: ReadonlyMap<string, Bank>;

beforeAll(async () => {
  const questions = Array.from({ length: 60 }, (_, index) => ({
    id: index + 1,
    description: `Question ${index + 1}`,
    answers: [
      {
        text: 'Incorrect',
        correct: false,
        justification: '',
      },
      {
        text: 'Correct',
        correct: true,
        justification: '',
      },
    ],
  }));
  bank = await validateBank({
    questions,
    version: createHash('sha256').update(JSON.stringify(questions)).digest('hex'),
  });
  banks = new Map([[bank.version, bank]]);
});

function activeSnapshot(): Snapshot {
  const run: PracticeRun = {
    id: 'run-1',
    bankVersion: bank.version,
    createdAt: 10,
    completedAt: null,
    status: 'active',
    questionIds: bank.questions.map((question) => question.id),
    answers: [{
      questionId: 1,
      answerIndex: 1,
      outcome: 'correctly_answered',
    }],
    nextUnanswered: 1,
    viewedPosition: 1,
    elapsedMs: 500,
    result: null,
  };
  return {
    ...emptySnapshot(),
    revision: 5,
    banks: [{
      version: bank.version,
      questionCount: 60,
    }],
    runs: [run],
    owners: [{
      runId: run.id,
      ownerId: 'session-a',
      expiresAt: 1000,
    }],
    learning: [{
      questionId: 1,
      bankVersion: bank.version,
      answerIndex: 0,
      outcome: 'incorrectly_answered',
    }],
  };
}

describe('transaction revision and ownership', () => {
  it('rejects a stale revision without modifying the caller snapshot', () => {
    const before = activeSnapshot();
    expect(() => applyTransaction(before, {
      expectedRevision: 4,
      changes: [{ kind: 'clearLearning' }],
    }, banks)).toThrow(StorageConflictError);
    expect(before.learning[0]!.outcome).toBe('incorrectly_answered');
    expect(before.revision).toBe(5);
  });

  it('clears learning without changing saved practice or timing', () => {
    const before = activeSnapshot();
    const after = applyTransaction(before, {
      expectedRevision: 5,
      changes: [{ kind: 'clearLearning' }],
    }, banks);
    expect(after.learning).toEqual([]);
    expect(after.runs).toEqual(before.runs);
    expect(after.owners).toEqual(before.owners);
    expect(after.revision).toBe(6);
    expect(before.learning[0]!.questionId).toBe(1);
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
    }, banks)).toThrow(StorageConflictError);
    const after = applyTransaction(before, {
      expectedRevision: 5,
      changes: [{
        kind: 'acquireOwner',
        owner,
        now: 1000,
      }],
    }, banks);
    expect(after.owners[0]!.ownerId).toBe('session-b');
    expect(after.runs[0]!.elapsedMs).toBe(500);
  });

  it('requires the current unexpired owner to update a run or release its lease', () => {
    const before = activeSnapshot();
    expect(() => applyTransaction(before, {
      expectedRevision: 5,
      changes: [{
        kind: 'putRun',
        run: {
          ...before.runs[0]!,
          elapsedMs: 600,
        },
      }],
    }, banks)).toThrow(StorageConflictError);
    expect(() => applyTransaction(before, {
      expectedRevision: 5,
      changes: [{
        kind: 'releaseOwner',
        runId: 'run-1',
        ownerId: 'session-b',
      }],
    }, banks)).toThrow(StorageConflictError);
    expect(() => applyTransaction(before, {
      expectedRevision: 5,
      changes: [{
        kind: 'putRun',
        run: before.runs[0]!,
        guard: {
          ownerId: 'session-a',
          now: 1000,
        },
      }],
    }, banks)).toThrow(StorageConflictError);
  });

  it('keeps answered choices immutable and accumulated time monotonic', () => {
    const before = activeSnapshot();
    const run = before.runs[0]!;
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
            outcome: 'incorrectly_answered',
          }],
        },
      }],
    }, banks)).toThrow('cannot be rewritten');
    expect(() => applyTransaction(before, {
      expectedRevision: 5,
      changes: [{
        kind: 'putRun',
        run: {
          ...run,
          elapsedMs: 499,
        },
        guard: {
          ownerId: 'session-a',
          now: 100,
        },
      }],
    }, banks)).toThrow('cannot be rewritten');
  });

  it('commits pause and ownership release together and rejects partial invalid changes', () => {
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
    }, banks)).toThrow('active');
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
    }, banks);
    expect(after.runs[0]!.status).toBe('paused');
    expect(after.runs[0]!.elapsedMs).toBe(900);
    expect(after.owners).toEqual([]);
    expect(before.runs[0]!.status).toBe('active');
  });
});

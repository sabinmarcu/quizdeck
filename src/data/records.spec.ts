import { createHash } from 'node:crypto';
import {
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { validateBank } from './bank';
import type { Bank } from './bank';
import {
  emptySnapshot,
  validateSnapshot,
} from './records';
import type {
  PracticeRun,
  Snapshot,
} from './records';

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
        justification: 'Correct explanation',
      },
    ],
  }));
  bank = await validateBank({
    questions,
    version: createHash('sha256').update(JSON.stringify(questions)).digest('hex'),
  });
  banks = new Map([[bank.version, bank]]);
});

function savedRun(): PracticeRun {
  return {
    id: 'run-1',
    bankVersion: bank.version,
    createdAt: 100,
    completedAt: null,
    status: 'paused',
    questionIds: bank.questions.map((question) => question.id),
    answers: [],
    nextUnanswered: 0,
    viewedPosition: 0,
    elapsedMs: 0,
    result: null,
  };
}

function persisted(): Snapshot {
  return {
    ...emptySnapshot(),
    banks: [{
      version: bank.version,
      questionCount: 60,
    }],
  };
}

describe('persisted progress validation', () => {
  it('rejects a fabricated outcome and a nonexistent choice', () => {
    const snapshot = persisted();
    snapshot.learning = [{
      questionId: 1,
      bankVersion: bank.version,
      answerIndex: 0,
      outcome: 'correctly_answered',
    }];
    expect(() => validateSnapshot(snapshot, banks)).toThrow('correctness');
    snapshot.learning[0]!.answerIndex = 2;
    expect(() => validateSnapshot(snapshot, banks)).toThrow('correctness');
  });

  it('rejects future question views and frontier mismatch', () => {
    const run = savedRun();
    expect(() => validateSnapshot({
      ...persisted(),
      runs: [{
        ...run,
        viewedPosition: 1,
      }],
    }, banks)).toThrow('frontier');
    expect(() => validateSnapshot({
      ...persisted(),
      runs: [{
        ...run,
        nextUnanswered: 1,
      }],
    }, banks)).toThrow('frontier');
  });

  it('rejects answers recorded out of saved practice order', () => {
    const run = savedRun();
    run.answers = [{
      questionId: 2,
      answerIndex: 1,
      outcome: 'correctly_answered',
    }];
    run.nextUnanswered = 1;
    expect(() => validateSnapshot({
      ...persisted(),
      runs: [run],
    }, banks)).toThrow('order');
  });

  it('requires completion and result to agree with all sixty answers', () => {
    const run = savedRun();
    run.answers = run.questionIds.map((questionId) => ({
      questionId,
      answerIndex: 1,
      outcome: 'correctly_answered',
    }));
    run.nextUnanswered = 60;
    run.viewedPosition = 59;
    expect(() => validateSnapshot({
      ...persisted(),
      runs: [run],
    }, banks)).toThrow('Unfinished');
    run.status = 'completed';
    run.completedAt = 200;
    run.result = {
      correctCount: 59,
      percentage: 100,
    };
    expect(() => validateSnapshot({
      ...persisted(),
      runs: [run],
    }, banks)).toThrow('inconsistent');
    run.result.correctCount = 60;
    expect(validateSnapshot({
      ...persisted(),
      runs: [run],
    }, banks).runs[0]!.result).toEqual({
      correctCount: 60,
      percentage: 100,
    });
  });

  it('rejects learning timers, missing bank snapshots, and duplicate answer identities', () => {
    const answer = {
      questionId: 1,
      bankVersion: bank.version,
      answerIndex: 1,
      outcome: 'correctly_answered',
    };
    expect(() => validateSnapshot({
      ...persisted(),
      learning: [{
        ...answer,
        elapsedMs: 42,
      }],
    }, banks)).toThrow();
    expect(() => validateSnapshot({
      ...persisted(),
      learning: [answer],
    }, new Map())).toThrow('catalog');
    expect(() => validateSnapshot({
      ...persisted(),
      learning: [answer, answer],
    }, banks)).toThrow('duplicate');
  });

  it('rejects timing ownership of a paused or missing run', () => {
    const owner = {
      runId: 'run-1',
      ownerId: 'session-a',
      expiresAt: 1000,
    };
    expect(() => validateSnapshot({
      ...persisted(),
      owners: [owner],
    }, banks)).toThrow('active');
    expect(() => validateSnapshot({
      ...persisted(),
      runs: [savedRun()],
      owners: [owner],
    }, banks)).toThrow('active');
  });
});

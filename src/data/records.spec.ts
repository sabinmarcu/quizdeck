import {
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import type { QuestionSet } from './question-set';
import { createFixtureSet } from './question-set.fixture';
import {
  emptySnapshot,
  runSchema,
  validateSnapshot,
} from './records';
import type {
  PracticeRun,
  Snapshot,
} from './records';

let set: QuestionSet;

beforeAll(async () => {
  set = await createFixtureSet(3);
});

function savedRun(): PracticeRun {
  return {
    id: 'run-1',
    createdAt: 100,
    completedAt: null,
    status: 'paused',
    questionIds: set.questions.map((question) => question.id),
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
    currentSet: set,
  };
}

describe('persisted progress validation', () => {
  it.each([[], [0, 0], [0, 1]].map((indices) => ({ indices })))('rejects empty, duplicate, or fabricated-correct selections $indices', ({ indices }) => {
    expect(() => validateSnapshot({
      ...persisted(),
      learning: [{
        questionId: 1,
        answerIndices: indices,
        outcome: 'correctly_answered',
      }],
    })).toThrow();
  });

  it('rejects fabricated outcomes, unavailable choices, and question IDs outside the current set', () => {
    expect(() => validateSnapshot({
      ...persisted(),
      learning: [{
        questionId: 1,
        answerIndices: [0],
        outcome: 'incorrectly_answered',
      }],
    })).toThrow('correctness');
    expect(() => validateSnapshot({
      ...persisted(),
      learning: [{
        questionId: 1,
        answerIndices: [2],
        outcome: 'correctly_answered',
      }],
    })).toThrow('correctness');
    expect(() => validateSnapshot({
      ...persisted(),
      learning: [{
        questionId: 4,
        answerIndices: [0],
        outcome: 'correctly_answered',
      }],
    })).toThrow('question set');
    expect(() => validateSnapshot({
      ...persisted(),
      runs: [{
        ...savedRun(),
        questionIds: [4],
      }],
    })).toThrow('missing question');
  });

  it('rejects duplicated record identities and progress without a current set', () => {
    const answer = {
      questionId: 1,
      answerIndices: [0],
      outcome: 'correctly_answered' as const,
    };
    expect(() => validateSnapshot({
      ...persisted(),
      learning: [answer, answer],
    })).toThrow('duplicate');
    expect(() => validateSnapshot({
      ...emptySnapshot(),
      learning: [answer],
    })).toThrow('missing current');
  });

  it('bounds run schemas from one through sixty distinct questions', () => {
    const one = {
      ...savedRun(),
      questionIds: [1],
    };
    expect(runSchema.parse(one).questionIds).toEqual([1]);
    expect(() => runSchema.parse({
      ...one,
      questionIds: [],
    })).toThrow();
    expect(() => runSchema.parse({
      ...one,
      questionIds: Array.from({ length: 61 }, (_, index) => index + 1),
    })).toThrow();
    expect(() => runSchema.parse({
      ...one,
      questionIds: [1, 1],
    })).toThrow('distinct');
  });

  it('rejects future views and incomplete answer frontiers', () => {
    expect(() => validateSnapshot({
      ...persisted(),
      runs: [{
        ...savedRun(),
        viewedPosition: 1,
      }],
    })).toThrow('frontier');
    expect(() => validateSnapshot({
      ...persisted(),
      runs: [{
        ...savedRun(),
        nextUnanswered: 1,
      }],
    })).toThrow('frontier');
  });

  it('requires completion and its score to agree with the three-question run length', () => {
    const completed = {
      ...savedRun(),
      status: 'completed' as const,
      completedAt: 200,
      questionIds: [1, 2, 3],
      answers: [1, 2, 3].map((questionId) => ({
        questionId,
        answerIndices: [0],
        outcome: 'correctly_answered' as const,
      })),
      nextUnanswered: 3,
      viewedPosition: 2,
      result: {
        correctCount: 3,
        percentage: 100,
      },
    };
    expect(validateSnapshot({
      ...persisted(),
      runs: [completed],
    }).runs[0]!.result).toEqual({
      correctCount: 3,
      percentage: 100,
    });
    expect(() => validateSnapshot({
      ...persisted(),
      runs: [{
        ...completed,
        status: 'active',
      }],
    })).toThrow('completion');
    expect(() => validateSnapshot({
      ...persisted(),
      runs: [{
        ...completed,
        result: {
          correctCount: 3,
          percentage: (3 / 60) * 100,
        },
      }],
    })).toThrow('inconsistent');
  });
});

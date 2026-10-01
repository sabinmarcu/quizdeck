import {
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import type { QuestionSet } from './question-set';
import { createFixtureSet } from './question-set.fixture';
import {
  answerPracticeRun,
  createPracticeRun,
  practiceReport,
  samplePracticeQuestions,
} from './practice';
import type { PracticeRun } from './records';

let oneQuestion: QuestionSet;
let threeQuestions: QuestionSet;
let sixtyQuestions: QuestionSet;
let seventyQuestions: QuestionSet;

beforeAll(async () => {
  [oneQuestion, threeQuestions, sixtyQuestions, seventyQuestions] = await Promise.all([
    createFixtureSet(1),
    createFixtureSet(3),
    createFixtureSet(60),
    createFixtureSet(70),
  ]);
});

function run(set: QuestionSet): PracticeRun {
  return {
    id: 'test-run',
    createdAt: 100,
    completedAt: null,
    status: 'active',
    questionIds: samplePracticeQuestions(set, () => 0),
    answers: [],
    nextUnanswered: 0,
    viewedPosition: 0,
    elapsedMs: 0,
    result: null,
  };
}

describe('practice question sampling', () => {
  it('uses every question below sixty and caps larger sets at sixty', () => {
    expect(samplePracticeQuestions(oneQuestion, () => 0)).toEqual([1]);
    expect(samplePracticeQuestions(threeQuestions, () => 0)).toEqual([1, 2, 3]);
    expect(samplePracticeQuestions(sixtyQuestions)).toHaveLength(60);
    const sampled = samplePracticeQuestions(seventyQuestions);
    expect(sampled).toHaveLength(60);
    expect(new Set(sampled).size).toBe(60);
    expect(sampled.every((id) => seventyQuestions.questions.some((question) => question.id === id)))
      .toBe(true);
  });

  it('creates a run whose length is the sampled set length and rejects invalid random indices', () => {
    const runForOne = createPracticeRun(oneQuestion, 'one-question-run', 50);
    expect(runForOne.questionIds).toHaveLength(1);
    expect(runForOne.nextUnanswered).toBe(0);
    expect(() => samplePracticeQuestions(threeQuestions, (limit) => limit)).toThrow('invalid index');
  });
});

describe('sequential answers and completed report', () => {
  it('records only the frontier and rejects edits, skips, and unavailable choices', () => {
    const before = run(threeQuestions);
    const after = answerPracticeRun(before, threeQuestions, {
      position: 0,
      answerIndex: 1,
      elapsedMs: 500,
      now: 600,
    });
    expect(before.answers).toEqual([]);
    expect(after.answers).toEqual([{
      questionId: 1,
      answerIndex: 1,
      outcome: 'incorrectly_answered',
    }]);
    expect(after.nextUnanswered).toBe(1);
    expect(after.viewedPosition).toBe(1);
    expect(() => answerPracticeRun(after, threeQuestions, {
      position: 0,
      answerIndex: 0,
      elapsedMs: 700,
      now: 800,
    })).toThrow('current');
    expect(() => answerPracticeRun(after, threeQuestions, {
      position: 2,
      answerIndex: 0,
      elapsedMs: 700,
      now: 800,
    })).toThrow('current');
    expect(() => answerPracticeRun(after, threeQuestions, {
      position: 1,
      answerIndex: 2,
      elapsedMs: 700,
      now: 800,
    })).toThrow('does not exist');
  });

  it('completes at the set-driven length and reports percentage over that length', () => {
    let current = run(threeQuestions);
    for (let position = 0; position < 3; position += 1) {
      current = answerPracticeRun(current, threeQuestions, {
        position,
        answerIndex: position === 0 ? 1 : 0,
        elapsedMs: position * 1000,
        now: 1000 + position * 1000,
      });
    }
    expect(current.status).toBe('completed');
    expect(current.nextUnanswered).toBe(3);
    expect(current.completedAt).toBe(3000);
    expect(current.result).toEqual({
      correctCount: 2,
      percentage: (2 / 3) * 100,
    });
    const report = practiceReport(current, threeQuestions)!;
    expect(report).toMatchObject({
      total: 3,
      correctCount: 2,
      percentage: (2 / 3) * 100,
    });
    expect(report.questions).toHaveLength(3);
    expect(() => answerPracticeRun(current, threeQuestions, {
      position: 2,
      answerIndex: 0,
      elapsedMs: 4000,
      now: 4000,
    })).toThrow('current');
  });
});

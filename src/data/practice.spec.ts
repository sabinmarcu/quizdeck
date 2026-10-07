import {
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import type {
  Question,
  QuestionSet,
} from './question-set';
import { createFixtureSet } from './question-set.fixture';
import {
  answerPracticeRun,
  createPracticeRun,
  practiceAnswerOrder,
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

function variableChoiceQuestion(id: number): Question {
  return {
    id,
    description: `Question ${id}`,
    answers: Array.from({ length: 7 }, (_, index) => ({
      text: `Answer ${index}`,
      correct: index === 3,
      justification: `Explanation ${index}`,
    })),
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

describe('stable practice answer order', () => {
  it('permutes variable-length choices consistently while incorporating run and question identity', () => {
    const question = variableChoiceQuestion(41);
    const order = practiceAnswerOrder('stable-run', question);
    expect(order).toHaveLength(question.answers.length);
    expect(order.toSorted((first, second) => first - second))
      .toEqual([...question.answers.keys()]);
    expect(practiceAnswerOrder('stable-run', variableChoiceQuestion(41))).toEqual(order);

    const runOrders = new Set(Array.from({ length: 16 }, (_, index) => (
      practiceAnswerOrder(`run-${index}`, question).join(',')
    )));
    const questionOrders = new Set(Array.from({ length: 16 }, (_, index) => (
      practiceAnswerOrder('stable-run', variableChoiceQuestion(index + 1)).join(',')
    )));
    expect(runOrders.size).toBeGreaterThan(1);
    expect(questionOrders.size).toBeGreaterThan(1);
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

  it('retains canonical answer identity in the matching displayed report order', () => {
    const firstQuestion = threeQuestions.questions[0]!;
    const secondQuestion = threeQuestions.questions[1]!;
    let current: PracticeRun = {
      id: 'report-order-run',
      createdAt: 100,
      completedAt: null,
      status: 'active',
      questionIds: [firstQuestion.id, secondQuestion.id],
      answers: [],
      nextUnanswered: 0,
      viewedPosition: 0,
      elapsedMs: 0,
      result: null,
    };
    const selectedIndexes = [0, 1];
    for (const [position, answerIndex] of selectedIndexes.entries()) {
      current = answerPracticeRun(current, threeQuestions, {
        position,
        answerIndex,
        elapsedMs: position * 1000,
        now: 1000 + position * 1000,
      });
    }

    const report = practiceReport(current, threeQuestions)!;
    expect(report.questions.map((question) => question.outcome))
      .toEqual(['correctly_answered', 'incorrectly_answered']);
    for (const [position, question] of [firstQuestion, secondQuestion].entries()) {
      const order = practiceAnswerOrder(current.id, question);
      expect(report.questions[position]!.choices.map((choice) => choice.text))
        .toEqual(order.map((answerIndex) => question.answers[answerIndex]!.text));
      expect(report.questions[position]!.choices.map((choice) => choice.selected))
        .toEqual(order.map((answerIndex) => answerIndex === selectedIndexes[position]!));
      expect(report.questions[position]!.choices.map((choice) => choice.correct))
        .toEqual(order.map((answerIndex) => question.answers[answerIndex]!.correct));
    }
  });
});

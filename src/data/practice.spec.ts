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
import { createQuestionSet } from './question-set';
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
  it('keeps a correct partial selection unanswered until all correct choices are selected', async () => {
    const set = await createQuestionSet([{
      id: 1,
      description: 'Select both correct choices',
      answers: [true, false, true].map((correct, index) => ({
        text: `Choice ${index}`,
        correct,
        justification: '',
      })),
    }], {
      name: 'Multiple',
      source: 'file',
      loadedAt: 0,
    });
    const current = run(set);
    const partial = answerPracticeRun(current, set, {
      position: 0,
      answerIndices: [0],
      elapsedMs: 500,
      now: 600,
    });
    expect(partial).toBe(current);
    expect(partial.answers).toEqual([]);
    expect(practiceReport(partial, set)).toBeNull();
    const complete = answerPracticeRun(partial, set, {
      position: 0,
      answerIndices: [0, 2],
      elapsedMs: 600,
      now: 700,
    });
    expect(complete.result).toEqual({
      correctCount: 1,
      percentage: 100,
    });
  });

  it.each([
    {
      indices: [0, 2],
      correct: true,
    },
    {
      indices: [2, 0],
      correct: true,
    },
    {
      indices: [0, 1, 2],
      correct: false,
    },
    {
      indices: [1],
      correct: false,
    },
  ])('scores and reports the complete selection $indices', async ({ indices, correct }) => {
    const set = await createQuestionSet([{
      id: 1,
      description: 'Select both correct choices',
      answers: [true, false, true].map((value, index) => ({
        text: `Choice ${index}`,
        correct: value,
        justification: '',
      })),
    }], {
      name: 'Multiple',
      source: 'file',
      loadedAt: 0,
    });
    const completed = answerPracticeRun(run(set), set, {
      position: 0,
      answerIndices: indices,
      elapsedMs: 500,
      now: 600,
    });
    expect(completed.result).toEqual({
      correctCount: correct ? 1 : 0,
      percentage: correct ? 100 : 0,
    });
    const report = practiceReport(completed, set)!;
    const selected = report.questions[0]!.choices.filter((choice) => choice.selected);
    expect(selected.map((choice) => choice.text)
      .toSorted((first, second) => first.localeCompare(second)))
      .toEqual(indices.map((index) => `Choice ${index}`)
        .toSorted((first, second) => first.localeCompare(second)));
  });

  it.each([[], [0, 0], [-1], [0.5], [2]].map((indices) => ({ indices })))('rejects invalid selections $indices without advancing', ({ indices }) => {
    const before = run(oneQuestion);
    expect(() => answerPracticeRun(before, oneQuestion, {
      position: 0,
      answerIndices: indices,
      elapsedMs: 500,
      now: 600,
    })).toThrow();
    expect(before.nextUnanswered).toBe(0);
    expect(before.answers).toEqual([]);
  });

  it('records only the frontier and rejects edits, skips, and unavailable choices', () => {
    const before = run(threeQuestions);
    const after = answerPracticeRun(before, threeQuestions, {
      position: 0,
      answerIndices: [1],
      elapsedMs: 500,
      now: 600,
    });
    expect(before.answers).toEqual([]);
    expect(after.answers).toEqual([{
      questionId: 1,
      answerIndices: [1],
      outcome: 'incorrectly_answered',
    }]);
    expect(after.nextUnanswered).toBe(1);
    expect(after.viewedPosition).toBe(1);
    expect(() => answerPracticeRun(after, threeQuestions, {
      position: 0,
      answerIndices: [0],
      elapsedMs: 700,
      now: 800,
    })).toThrow('current');
    expect(() => answerPracticeRun(after, threeQuestions, {
      position: 2,
      answerIndices: [0],
      elapsedMs: 700,
      now: 800,
    })).toThrow('current');
    expect(() => answerPracticeRun(after, threeQuestions, {
      position: 1,
      answerIndices: [2],
      elapsedMs: 700,
      now: 800,
    })).toThrow('does not exist');
  });

  it('completes at the set-driven length and reports percentage over that length', () => {
    let current = run(threeQuestions);
    for (let position = 0; position < 3; position += 1) {
      current = answerPracticeRun(current, threeQuestions, {
        position,
        answerIndices: [position === 0 ? 1 : 0],
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
      answerIndices: [0],
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
        answerIndices: [answerIndex],
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

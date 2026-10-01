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
  answerPracticeRun,
  practiceReport,
  samplePracticeQuestions,
} from './practice';
import type { PracticeRun } from './records';

let bank: Bank;
beforeAll(async () => {
  const questions = Array.from({ length: 65 }, (_, index) => ({
    id: index + 5,
    description: `Question ${index + 5}`,
    answers: [
      {
        text: 'Correct source choice',
        correct: true,
        justification: 'Correct explanation',
      },
      {
        text: 'Wrong source choice',
        correct: false,
        justification: '',
      },
      {
        text: 'Another wrong choice',
        correct: false,
        justification: '',
      },
    ],
  }));
  bank = await validateBank({
    questions,
    version: createHash('sha256').update(JSON.stringify(questions)).digest('hex'),
  });
});

function run(): PracticeRun {
  return {
    id: 'test-run',
    bankVersion: bank.version,
    createdAt: 100,
    completedAt: null,
    status: 'active',
    questionIds: samplePracticeQuestions(bank, () => 0),
    answers: [],
    nextUnanswered: 0,
    viewedPosition: 0,
    elapsedMs: 0,
    result: null,
  };
}

describe('practice question sampling', () => {
  it('selects exactly sixty distinct valid source IDs', () => {
    const ids = samplePracticeQuestions(bank);
    expect(ids).toHaveLength(60);
    expect(new Set(ids).size).toBe(60);
    expect(ids.every((id) => bank.questions.some((question) => question.id === id))).toBe(true);
  });

  it('handles the sixty-question boundary and refuses a smaller bank', () => {
    const exact = {
      ...bank,
      questions: bank.questions.slice(0, 60),
    };
    expect(new Set(samplePracticeQuestions(exact)).size).toBe(60);
    expect(() => samplePracticeQuestions({
      ...bank,
      questions: bank.questions.slice(0, 59),
    })).toThrow('at least 60');
    expect(() => samplePracticeQuestions(bank, (limit) => limit)).toThrow('invalid index');
  });
});

describe('sequential answers and completed report', () => {
  it('records a choice at the frontier, advances once, and rejects edits or skipped positions', () => {
    const before = run();
    const after = answerPracticeRun(before, bank, {
      position: 0,
      answerIndex: 1,
      elapsedMs: 500,
      now: 600,
    });
    expect(before.answers).toEqual([]);
    expect(after.answers).toEqual([{
      questionId: 5,
      answerIndex: 1,
      outcome: 'incorrectly_answered',
    }]);
    expect(after.nextUnanswered).toBe(1);
    expect(after.viewedPosition).toBe(1);
    expect(practiceReport(after, bank)).toBeNull();
    expect(() => answerPracticeRun(after, bank, {
      position: 0,
      answerIndex: 0,
      elapsedMs: 700,
      now: 800,
    })).toThrow('current');
    expect(() => answerPracticeRun(after, bank, {
      position: 2,
      answerIndex: 0,
      elapsedMs: 700,
      now: 800,
    })).toThrow('current');
    expect(() => answerPracticeRun({
      ...after,
      viewedPosition: 0,
    }, bank, {
      position: 1,
      answerIndex: 0,
      elapsedMs: 700,
      now: 800,
    })).toThrow('current');
  });

  it('does not invent a fourth choice or accept answers while paused', () => {
    expect(() => answerPracticeRun(run(), bank, {
      position: 0,
      answerIndex: 3,
      elapsedMs: 0,
      now: 100,
    })).toThrow('does not exist');
    expect(() => answerPracticeRun({
      ...run(),
      status: 'paused',
    }, bank, {
      position: 0,
      answerIndex: 0,
      elapsedMs: 0,
      now: 100,
    })).toThrow('current');
  });

  it('completes on answer sixty and reports the original unsorted practice order', () => {
    let current = {
      ...run(),
      questionIds: samplePracticeQuestions(bank, (limit) => limit - 1),
    };
    for (let position = 0; position < 60; position += 1) {
      current = answerPracticeRun(current, bank, {
        position,
        answerIndex: position === 0 ? 1 : 0,
        elapsedMs: position * 1000,
        now: 1000 + position * 1000,
      });
    }
    expect(current.status).toBe('completed');
    expect(current.completedAt).toBe(60_000);
    const report = practiceReport(current, bank)!;
    expect(report.correctCount).toBe(59);
    expect(report.questions).toHaveLength(60);
    expect(report.questions[0]).toMatchObject({
      position: 1,
      questionId: 69,
      outcome: 'incorrectly_answered',
    });
    expect(report.questions[0]!.choices[1]).toMatchObject({
      selected: true,
      correct: false,
    });
    expect(report.questions.at(-1)!.questionId).toBe(63);
    expect(() => answerPracticeRun(current, bank, {
      position: 59,
      answerIndex: 1,
      elapsedMs: 60_000,
      now: 61_000,
    })).toThrow('current');
  });
});

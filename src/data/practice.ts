import type { Bank } from './bank';
import type { PracticeRun } from './records';

export const practiceQuestionCount = 60;

function randomIndex(limit: number): number {
  const sample = new Uint32Array(1);
  const ceiling = Math.floor(0x1_00_00_00_00 / limit) * limit;
  do {
    crypto.getRandomValues(sample);
  } while (sample[0]! >= ceiling);
  return sample[0]! % limit;
}

export function samplePracticeQuestions(
  bank: Bank,
  // A bounded random source makes sampling boundary tests deterministic.
  random: (limit: number) => number = randomIndex,
) {
  if (bank.questions.length < practiceQuestionCount) {
    throw new Error('Practice requires at least 60 valid questions.');
  }
  const ids = bank.questions.map((question) => question.id);
  for (let index = 0; index < practiceQuestionCount; index += 1) {
    const offset = random(ids.length - index);
    if (!Number.isInteger(offset) || offset < 0 || offset >= ids.length - index) {
      throw new Error('Random question selection returned an invalid index.');
    }
    const chosen = index + offset;
    const previous = ids[index]!;
    ids[index] = ids[chosen]!;
    ids[chosen] = previous;
  }
  return ids.slice(0, practiceQuestionCount);
}

export function createPracticeRun(bank: Bank, id: string, now: number): PracticeRun {
  return {
    id,
    bankVersion: bank.version,
    createdAt: now,
    completedAt: null,
    status: 'active',
    questionIds: samplePracticeQuestions(bank),
    answers: [],
    nextUnanswered: 0,
    viewedPosition: 0,
    elapsedMs: 0,
    result: null,
  };
}

export namespace answerPracticeRun {
  export interface Input {
    position: number;
    answerIndex: number;
    elapsedMs: number;
    now: number;
  }
}

export function answerPracticeRun(
  run: PracticeRun,
  bank: Bank,
  // The caller captures the viewed position before starting a save.
  input: answerPracticeRun.Input,
): PracticeRun {
  if (run.status !== 'active' || input.position !== run.nextUnanswered
    || input.position !== run.viewedPosition || run.nextUnanswered >= practiceQuestionCount) {
    throw new Error('Only the current unanswered practice question accepts an answer.');
  }
  const question = bank.questions.find((entry) => entry.id === run.questionIds[input.position]);
  const choice = question?.answers[input.answerIndex];
  if (!Number.isInteger(input.answerIndex) || !choice) {
    throw new Error('That answer does not exist for this practice question.');
  }
  const answers = [...run.answers, {
    questionId: question!.id,
    answerIndex: input.answerIndex,
    outcome: choice.correct ? 'correctly_answered' as const : 'incorrectly_answered' as const,
  }];
  const nextUnanswered = answers.length;
  const completed = nextUnanswered === practiceQuestionCount;
  const correctCount = answers.filter((answer) => answer.outcome === 'correctly_answered').length;
  return {
    ...run,
    answers,
    nextUnanswered,
    viewedPosition: completed ? practiceQuestionCount - 1 : nextUnanswered,
    elapsedMs: Math.max(run.elapsedMs, input.elapsedMs),
    status: completed ? 'completed' : 'active',
    completedAt: completed ? Math.max(run.createdAt, input.now) : null,
    result: completed
      ? {
        correctCount,
        percentage: (correctCount / practiceQuestionCount) * 100,
      }
      : null,
  };
}

export interface PracticeReportQuestion {
  position: number;
  questionId: number;
  description: string;
  outcome: 'correctly_answered' | 'incorrectly_answered';
  choices: Array<{ text: string; selected: boolean; correct: boolean; justification: string }>;
}

export interface PracticeReport {
  runId: string;
  completedAt: number;
  elapsedMs: number;
  correctCount: number;
  percentage: number;
  questions: PracticeReportQuestion[];
}

export function practiceReport(run: PracticeRun, bank: Bank): PracticeReport | null {
  if (run.status !== 'completed' || !run.result || run.completedAt === null) {
    return null;
  }
  return {
    runId: run.id,
    completedAt: run.completedAt,
    elapsedMs: run.elapsedMs,
    ...run.result,
    questions: run.questionIds.map((id, index) => {
      const question = bank.questions.find((entry) => entry.id === id);
      const answer = run.answers[index];
      if (!question || !answer) {
        throw new Error('The saved report references unavailable question content.');
      }
      return {
        position: index + 1,
        questionId: id,
        description: question.description,
        outcome: answer.outcome,
        choices: question.answers.map((choice, choiceIndex) => ({
          text: choice.text,
          selected: answer.answerIndex === choiceIndex,
          correct: choice.correct,
          justification: choice.justification || 'No explanation provided in the source.',
        })),
      };
    }),
  };
}

export function formatPracticeDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

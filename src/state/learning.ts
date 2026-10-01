import { atom } from 'jotai';
import { z } from 'zod';
import type { Bank } from '../data/bank';
import type { LearningAnswer } from '../data/records';
import {
  actionErrorAtom,
  commitAtom,
  pendingAtom,
  startupAtom,
} from './application';

export const learningFilters = ['all', 'unanswered', 'completed', 'correctly_answered', 'incorrectly_answered'] as const;
export type LearningFilter = typeof learningFilters[number];
export type LearningStatus = LearningAnswer['outcome'] | 'unanswered';
export const learningStatusLabels: Record<LearningStatus | 'all' | 'completed', string> = {
  all: 'All',
  unanswered: 'Unanswered',
  completed: 'Completed',
  correctly_answered: 'Correctly answered',
  incorrectly_answered: 'Incorrectly answered',
};
export interface LearningRow { id: number; description: string; status: LearningStatus }
export interface LearningChoice {
  text: string;
  feedback: null | { selected: boolean; correct: boolean; justification: string };
}
export interface LearningDetail {
  id: number;
  description: string;
  status: LearningStatus;
  choices: LearningChoice[];
  historical: boolean;
}

export const learningQueryAtom = atom('');
export const learningFilterAtom = atom<LearningFilter>('all');
export const learningFocusedIdAtom = atom<number | null>(null);
export const learningQuestionIdAtom = atom<number | null>(null);
export const learningDetailOrderAtom = atom<readonly number[]>([]);
export const learningResetOpenAtom = atom(false);

export function learningAnswerIndex(key: string): number | null {
  if (key.length !== 1) {
    return null;
  }
  const index = 'abcd1234'.indexOf(key.toLowerCase());
  return index === -1 ? null : index % 4;
}

const questionIndexes = new WeakMap<Bank, ReadonlyMap<number, Bank['questions'][number]>>();
function questionsById(bank: Bank) {
  let index = questionIndexes.get(bank);
  if (!index) {
    index = new Map(bank.questions.map((question) => [question.id, question]));
    questionIndexes.set(bank, index);
  }
  return index;
}

const answersAtom = atom((get) => {
  const startup = get(startupAtom);
  return new Map(startup.status === 'ready'
    ? startup.snapshot.learning.map((answer) => [answer.questionId, answer])
    : []);
});
export const learningRowsAtom = atom<LearningRow[]>((get) => {
  const startup = get(startupAtom);
  if (startup.status !== 'ready') {
    return [];
  }
  const query = get(learningQueryAtom).trim().toLocaleLowerCase();
  const filter = get(learningFilterAtom);
  const answers = get(answersAtom);
  return startup.bank.questions.flatMap((question) => {
    const status = answers.get(question.id)?.outcome ?? 'unanswered';
    const matchesStatus = filter === 'all' || status === filter
      || (filter === 'completed' && status !== 'unanswered');
    if (!matchesStatus || (query && !String(question.id).includes(query)
      && !question.description.toLocaleLowerCase().includes(query))) {
      return [];
    }
    return [{
      id: question.id,
      description: question.description,
      status,
    }];
  });
});
export const learningCountsAtom = atom((get) => {
  const startup = get(startupAtom);
  const answers = get(answersAtom);
  let completed = 0;
  if (startup.status === 'ready') {
    for (const question of startup.bank.questions) {
      if (answers.has(question.id)) {
        completed += 1;
      }
    }
  }
  return {
    completed,
    total: startup.status === 'ready' ? startup.bank.questions.length : 0,
  };
});
export const learningDetailAtom = atom<LearningDetail | null>((get) => {
  const startup = get(startupAtom);
  const id = get(learningQuestionIdAtom);
  if (startup.status !== 'ready' || id === null) {
    return null;
  }
  const saved = get(answersAtom).get(id);
  const sourceBank = saved ? startup.banks.get(saved.bankVersion) : startup.bank;
  if (!sourceBank) {
    throw new Error('Recorded question content is unavailable.');
  }
  const question = questionsById(sourceBank).get(id);
  if (!question) {
    return null;
  }
  return {
    id: question.id,
    description: question.description,
    status: saved?.outcome ?? 'unanswered',
    historical: sourceBank.version !== startup.bank.version,
    choices: question.answers.map((answer, index) => ({
      text: answer.text,
      feedback: saved
        ? {
          selected: saved.answerIndex === index,
          correct: answer.correct,
          justification: answer.justification || 'No explanation provided in the source.',
        }
        : null,
    })),
  };
});

export const learningAdjacentAtom = atom((get) => {
  const id = get(learningQuestionIdAtom);
  const order = get(learningDetailOrderAtom);
  const index = id === null ? -1 : order.indexOf(id);
  return {
    previous: index > 0 ? order[index - 1] ?? null : null,
    next: index >= 0 ? order[index + 1] ?? null : null,
  };
});

export const openLearningQuestionAtom = atom(null, (get, set, questionId: number) => {
  const startup = get(startupAtom);
  if (startup.status !== 'ready' || !questionsById(startup.bank).has(questionId)) {
    return;
  }
  if (get(learningQuestionIdAtom) === null
    || !get(learningDetailOrderAtom).includes(questionId)) {
    set(learningDetailOrderAtom, get(learningRowsAtom).map((row) => row.id));
  }
  set(actionErrorAtom, null);
  set(learningFocusedIdAtom, questionId);
  set(learningQuestionIdAtom, questionId);
});

export interface LearningAnswerInput {
  questionId: number;
  answerIndex: number;
}

export const answerLearningAtom = atom(null, async (get, set, input: LearningAnswerInput) => {
  if (get(pendingAtom)) {
    return false;
  }
  try {
    const validated = z.strictObject({
      questionId: z.number().int().positive(),
      answerIndex: z.number().int().nonnegative(),
    }).parse(input);
    const startup = get(startupAtom);
    if (startup.status !== 'ready') {
      throw new Error('Progress storage is unavailable.');
    }
    if (get(learningQuestionIdAtom) !== validated.questionId) {
      throw new Error('Open the question before answering it.');
    }
    if (get(answersAtom).has(validated.questionId)) {
      throw new Error('This question is already answered. Reset all learning progress to answer again.');
    }
    const question = questionsById(startup.bank).get(validated.questionId);
    const choice = question?.answers[validated.answerIndex];
    if (!choice) {
      throw new Error('That answer is not available for this question.');
    }
    await set(commitAtom, [{
      kind: 'putLearning',
      answer: {
        questionId: validated.questionId,
        bankVersion: startup.bank.version,
        answerIndex: validated.answerIndex,
        outcome: choice.correct ? 'correctly_answered' : 'incorrectly_answered',
      },
    }]);
    return true;
  } catch (error) {
    set(actionErrorAtom, error instanceof Error ? error.message : 'The answer could not be saved.');
    return false;
  }
});

export const resetLearningAtom = atom(null, async (get, set) => {
  if (!get(learningResetOpenAtom) || get(pendingAtom)) {
    return false;
  }
  try {
    await set(commitAtom, [{ kind: 'clearLearning' }]);
    set(learningResetOpenAtom, false);
    return true;
  } catch (error) {
    set(actionErrorAtom, error instanceof Error ? error.message : 'Learning progress could not be reset.');
    return false;
  }
});

import { atom } from 'jotai';
import { z } from 'zod';
import type { QuestionSet } from '../data/question-set';
import type { LearningAnswer } from '../data/records';
import { selectionOutcome } from '../data/question-set';
import {
  actionErrorAtom,
  commitAtom,
  pendingAtom,
  startupAtom,
} from './application';
import {
  learningQueryAtom,
  learningFilterAtom,
  learningFocusedIdAtom,
  learningQuestionIdAtom,
  learningDetailOrderAtom,
  learningResetOpenAtom,
  learningSelectionAtom,
} from './learning-state';

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
  selected: boolean;
  feedback: null | { selected: boolean; correct: boolean; justification: string | null };
}
export interface LearningDetail {
  id: number;
  description: string;
  status: LearningStatus;
  multiple: boolean;
  justification: string | null;
  choices: LearningChoice[];
}

export function learningAnswerIndex(key: string): number | null {
  if (key.length !== 1) {
    return null;
  }
  const index = 'abcd1234'.indexOf(key.toLowerCase());
  return index === -1 ? null : index % 4;
}

const questionIndexes = new WeakMap<QuestionSet, ReadonlyMap<number, QuestionSet['questions'][number]>>();
function questionsById(currentSet: QuestionSet) {
  let index = questionIndexes.get(currentSet);
  if (!index) {
    index = new Map(currentSet.questions.map((question) => [question.id, question]));
    questionIndexes.set(currentSet, index);
  }
  return index;
}

const answersAtom = atom((get) => {
  const startup = get(startupAtom);
  return new Map(startup.status === 'ready'
    ? startup.snapshot.learning.map((answer) => [answer.questionId, answer])
    : []);
});
export const firstUnansweredLearningQuestionIdAtom = atom<number | null>((get) => {
  const startup = get(startupAtom);
  if (startup.status !== 'ready') {
    return null;
  }
  const answers = get(answersAtom);
  let firstId: number | null = null;
  for (const question of startup.set.questions) {
    if (!answers.has(question.id) && (firstId === null || question.id < firstId)) {
      firstId = question.id;
    }
  }
  return firstId;
});
export const learningRowsAtom = atom<LearningRow[]>((get) => {
  const startup = get(startupAtom);
  if (startup.status !== 'ready') {
    return [];
  }
  const query = get(learningQueryAtom).trim().toLocaleLowerCase();
  const filter = get(learningFilterAtom);
  const answers = get(answersAtom);
  const questions = startup.set.questions.toSorted((first, second) => first.id - second.id);
  return questions.flatMap((question) => {
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
    for (const question of startup.set.questions) {
      if (answers.has(question.id)) {
        completed += 1;
      }
    }
  }
  return {
    completed,
    total: startup.status === 'ready' ? startup.set.questionCount : 0,
  };
});
export const learningDetailAtom = atom<LearningDetail | null>((get) => {
  const startup = get(startupAtom);
  const id = get(learningQuestionIdAtom);
  if (startup.status !== 'ready' || id === null) {
    return null;
  }
  const saved = get(answersAtom).get(id);
  const question = questionsById(startup.set).get(id);
  if (!question) {
    return null;
  }
  const selection = get(learningSelectionAtom);
  return {
    id: question.id,
    description: question.description,
    status: saved?.outcome ?? 'unanswered',
    multiple: question.answers.reduce((count, answer) => count + Number(answer.correct), 0) > 1,
    justification: saved ? question.justification || null : null,
    choices: question.answers.map((answer, index) => ({
      text: answer.text,
      selected: saved?.answerIndices.includes(index)
        ?? (selection?.questionId === id && selection.answerIndices.includes(index)),
      feedback: saved
        ? {
          selected: saved.answerIndices.includes(index),
          correct: answer.correct,
          justification: answer.justification
            || (question.justification ? null : 'No explanation provided in the source.'),
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
  if (startup.status !== 'ready' || !questionsById(startup.set).has(questionId)) {
    return;
  }
  if (get(learningQuestionIdAtom) !== questionId) {
    set(learningSelectionAtom, null);
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
      answerIndex: z.number().int().nonnegative().safe(),
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
    const question = questionsById(startup.set).get(validated.questionId);
    if (!question || !question.answers[validated.answerIndex]) {
      throw new Error('That answer is not available for this question.');
    }
    const selection = get(learningSelectionAtom);
    const previous = selection?.questionId === validated.questionId ? selection.answerIndices : [];
    if (previous.includes(validated.answerIndex)) {
      return true;
    }
    const answerIndices = [...previous, validated.answerIndex];
    const outcome = selectionOutcome(question, answerIndices);
    if (outcome === null) {
      set(learningSelectionAtom, {
        questionId: validated.questionId,
        answerIndices,
      });
      set(actionErrorAtom, null);
      return true;
    }
    await set(commitAtom, [{
      kind: 'putLearning',
      answer: {
        questionId: validated.questionId,
        answerIndices,
        outcome,
      },
    }]);
    set(learningSelectionAtom, null);
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
    set(learningSelectionAtom, null);
    set(learningResetOpenAtom, false);
    return true;
  } catch (error) {
    set(actionErrorAtom, error instanceof Error ? error.message : 'Learning progress could not be reset.');
    return false;
  }
});

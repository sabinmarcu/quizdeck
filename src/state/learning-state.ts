import { atom } from 'jotai';

export const learningFilters = ['all', 'unanswered', 'completed', 'correctly_answered', 'incorrectly_answered'] as const;
export type LearningFilter = typeof learningFilters[number];

export const learningQueryAtom = atom('');
export const learningFilterAtom = atom<LearningFilter>('all');
export const learningFocusedIdAtom = atom<number | null>(null);
export const learningQuestionIdAtom = atom<number | null>(null);
export const learningDetailOrderAtom = atom<readonly number[]>([]);
export const learningResetOpenAtom = atom(false);
export const learningSelectionAtom = atom<{
  questionId: number;
  answerIndices: number[];
} | null>(null);

export const resetLearningStateAtom = atom(null, (_get, set) => {
  set(learningQueryAtom, '');
  set(learningFilterAtom, 'all');
  set(learningFocusedIdAtom, null);
  set(learningQuestionIdAtom, null);
  set(learningDetailOrderAtom, []);
  set(learningResetOpenAtom, false);
  set(learningSelectionAtom, null);
});

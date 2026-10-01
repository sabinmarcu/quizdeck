import { atom } from 'jotai';
import { practiceReport } from '../data/practice';
import type { PracticeReport } from '../data/practice';
import type { PracticeRun } from '../data/records';
import { startupAtom } from './application';
import {
  practiceSelectedIdAtom,
  practiceOwnedAtom,
  practiceElapsedAtom,
} from './practice-session';

export {
  practiceSelectedIdAtom,
  practiceOwnedAtom,
  practiceBusyAtom,
  practiceElapsedAtom,
  practiceErrorAtom,
  startPracticeAtom,
  openPracticeAtom,
  answerPracticeAtom,
  viewPracticeAtom,
  pausePracticeAtom,
  resumePracticeAtom,
  leavePracticeAtom,
  refreshPracticeAtom,
} from './practice-session';

export interface PracticeHistoryEntry {
  id: string;
  createdAt: number;
  status: PracticeRun['status'];
  answeredCount: number;
  total: number;
  elapsedMs: number;
  score: null | { correctCount: number; percentage: number };
}
export interface PracticeView {
  runId: string;
  position: number;
  nextUnanswered: number;
  total: number;
  description: string;
  choices: Array<{ text: string; selected: boolean }>;
  canAnswer: boolean;
  canPrevious: boolean;
  canNext: boolean;
  paused: boolean;
  elapsedMs: number;
}

const selectedRunAtom = atom((get) => {
  const startup = get(startupAtom);
  const id = get(practiceSelectedIdAtom);
  return startup.status === 'ready' ? startup.snapshot.runs.find((run) => run.id === id) ?? null : null;
});
export const practiceHistoryAtom = atom<PracticeHistoryEntry[]>((get) => {
  const startup = get(startupAtom);
  if (startup.status !== 'ready') {
    return [];
  }
  return startup.snapshot.runs.map((run) => ({
    id: run.id,
    createdAt: run.createdAt,
    status: run.status,
    answeredCount: run.answers.length,
    total: run.questionIds.length,
    elapsedMs: run.elapsedMs,
    score: run.status === 'completed' ? run.result : null,
  })).toSorted((first, second) => second.createdAt - first.createdAt);
});
export const practiceViewAtom = atom<PracticeView | null>((get) => {
  const run = get(selectedRunAtom);
  const startup = get(startupAtom);
  if (!run || run.status === 'completed' || startup.status !== 'ready') {
    return null;
  }
  const questionId = run.questionIds[run.viewedPosition];
  const question = startup.set.questions.find((entry) => entry.id === questionId);
  if (!question) {
    throw new Error('Saved practice question content is unavailable.');
  }
  const saved = run.answers[run.viewedPosition];
  const owned = get(practiceOwnedAtom);
  return {
    runId: run.id,
    position: run.viewedPosition,
    nextUnanswered: run.nextUnanswered,
    total: run.questionIds.length,
    description: question.description,
    choices: question.answers.map((choice, index) => ({
      text: choice.text,
      selected: saved?.answerIndex === index,
    })),
    canAnswer: owned && run.status === 'active' && run.viewedPosition === run.nextUnanswered,
    canPrevious: run.viewedPosition > 0,
    canNext: run.viewedPosition < run.nextUnanswered,
    paused: !owned,
    elapsedMs: owned ? Math.max(run.elapsedMs, get(practiceElapsedAtom)) : run.elapsedMs,
  };
});
export const practiceReportAtom = atom<PracticeReport | null>((get) => {
  const run = get(selectedRunAtom);
  const startup = get(startupAtom);
  if (!run || run.status !== 'completed' || startup.status !== 'ready') {
    return null;
  }
  return practiceReport(run, startup.set);
});


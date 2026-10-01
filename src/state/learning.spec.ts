import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  rm,
} from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { SqliteProgressStorage } from '../cli/sqlite';
import { validateBank } from '../data/bank';
import type { PracticeRun } from '../data/records';
import {
  commitAtom,
  createAppSession,
  pendingAtom,
  startupAtom,
  actionErrorAtom,
} from './application';
import type { AppSession } from './application';
import {
  answerLearningAtom,
  learningAnswerIndex,
  learningAdjacentAtom,
  learningCountsAtom,
  learningDetailAtom,
  learningFilterAtom,
  learningFocusedIdAtom,
  learningQueryAtom,
  learningQuestionIdAtom,
  learningResetOpenAtom,
  learningRowsAtom,
  openLearningQuestionAtom,
  resetLearningAtom,
} from './learning';

let directory: string;
let filename: string;
let session: AppSession;

beforeEach(async () => {
  await mkdir('tmp', { recursive: true });
  directory = await mkdtemp('tmp/learning-spec-');
  filename = path.join(directory, 'progress.sqlite');
  session = createAppSession(() => SqliteProgressStorage.open({ path: filename }));
  await session.start();
});

afterEach(async () => {
  session.close();
  await rm(directory, {
    recursive: true,
    force: true,
  });
});

function ready() {
  const startup = session.store.get(startupAtom);
  if (startup.status !== 'ready') {
    throw new Error('Real SQLite storage did not initialize');
  }
  return startup;
}

async function record(questionId: number, correct: boolean) {
  const question = ready().bank.questions.find((entry) => entry.id === questionId)!;
  session.store.set(openLearningQuestionAtom, questionId);
  return session.store.set(answerLearningAtom, {
    questionId,
    answerIndex: question.answers.findIndex((choice) => choice.correct === correct),
  });
}

describe('persisted learning workflow', () => {
  it('rejects empty special-key payloads and pasted strings as answer shortcuts', () => {
    for (const key of ['', 'Delete', '\t', ' ', 'ab', '12', '4.0']) {
      expect(learningAnswerIndex(key)).toBeNull();
    }
    expect(learningAnswerIndex('A')).toBe(0);
    expect(learningAnswerIndex('4')).toBe(3);
  });

  it('does not expose feedback or complete a question just because it is opened', () => {
    const before = ready().snapshot;
    session.store.set(openLearningQuestionAtom, 1);
    const detail = session.store.get(learningDetailAtom)!;
    expect(detail.status).toBe('unanswered');
    expect(detail.choices.every((choice) => choice.feedback === null)).toBe(true);
    expect(session.store.get(learningCountsAtom).completed).toBe(0);
    expect(ready().snapshot.revision).toBe(before.revision);
  });

  it('completes both outcomes, revealing the saved answer and honest source exceptions', async () => {
    expect(await record(1, true)).toBe(true);
    expect(session.store.get(learningDetailAtom)!.status).toBe('correctly_answered');
    const correctDetail = session.store.get(learningDetailAtom)!;
    const correctChoice = correctDetail.choices.find((choice) => choice.feedback?.selected);
    expect(correctChoice?.feedback?.correct).toBe(true);
    expect(await record(3, false)).toBe(true);
    const detail = session.store.get(learningDetailAtom)!;
    expect(detail.status).toBe('incorrectly_answered');
    const selected = detail.choices.find((choice) => choice.feedback?.selected);
    expect(selected?.feedback?.correct).toBe(false);
    expect(session.store.get(learningCountsAtom)).toEqual({
      completed: 2,
      total: 175,
    });
    expect(ready().snapshot.learning.every((answer) => !('elapsedMs' in answer))).toBe(true);
  });

  it('uses description and source IDs for search, with status filters and independent totals', async () => {
    await record(1, true);
    await record(3, false);
    session.store.set(learningQueryAtom, 'SYNTHESIS AGENT');
    const descriptionMatches = session.store.get(learningRowsAtom);
    expect(descriptionMatches.some((row) => row.id === 1)).toBe(true);
    expect(descriptionMatches.every((row) => row.description.toLowerCase().includes('synthesis agent'))).toBe(true);
    session.store.set(learningQueryAtom, '');
    session.store.set(learningFilterAtom, 'completed');
    expect(session.store.get(learningRowsAtom).map((row) => row.id)).toEqual([1, 3]);
    session.store.set(learningFilterAtom, 'incorrectly_answered');
    expect(session.store.get(learningRowsAtom).map((row) => row.id)).toEqual([3]);
    session.store.set(learningFilterAtom, 'correctly_answered');
    expect(session.store.get(learningRowsAtom).map((row) => row.id)).toEqual([1]);
    session.store.set(learningFilterAtom, 'all');
    session.store.set(learningQueryAtom, '140');
    expect(session.store.get(learningRowsAtom).some((row) => row.id === 140)).toBe(true);
    session.store.set(learningQueryAtom, 'no matching study content anywhere');
    expect(session.store.get(learningRowsAtom)).toEqual([]);
    expect(session.store.get(learningCountsAtom)).toEqual({
      completed: 2,
      total: 175,
    });
    session.store.set(learningQueryAtom, ready().bank.questions[0]!.answers[0]!.justification);
    expect(session.store.get(learningRowsAtom).some((row) => row.id === 1)).toBe(false);
  });

  it('preserves list context and restores saved feedback after a new application session', async () => {
    session.store.set(learningQueryAtom, 'coordinator');
    session.store.set(learningFilterAtom, 'unanswered');
    await record(1, true);
    session.store.set(learningQuestionIdAtom, null);
    expect(session.store.get(learningQueryAtom)).toBe('coordinator');
    expect(session.store.get(learningFilterAtom)).toBe('unanswered');
    expect(session.store.get(learningFocusedIdAtom)).toBe(1);
    session.close();
    session = createAppSession(() => SqliteProgressStorage.open({ path: filename }));
    await session.start();
    session.store.set(openLearningQuestionAtom, 1);
    expect(session.store.get(learningDetailAtom)!.status).toBe('correctly_answered');
    const reopenedDetail = session.store.get(learningDetailAtom)!;
    expect(reopenedDetail.choices.some((choice) => choice.feedback?.selected)).toBe(true);
  });

  it('rejects a phantom fourth choice and a changed answer without modifying committed progress', async () => {
    session.store.set(openLearningQuestionAtom, 140);
    expect(session.store.get(learningDetailAtom)!.choices).toHaveLength(3);
    const before = ready().snapshot;
    expect(await session.store.set(answerLearningAtom, {
      questionId: 140,
      answerIndex: 3,
    })).toBe(false);
    expect(ready().snapshot.learning).toEqual([]);
    expect(ready().snapshot.revision).toBe(before.revision);
    await record(140, true);
    const saved = ready().snapshot;
    expect(await session.store.set(answerLearningAtom, {
      questionId: 140,
      answerIndex: 0,
    })).toBe(false);
    expect(ready().snapshot.learning).toEqual(saved.learning);
  });

  it('keeps feedback concealed and allows retry when native answer persistence fails', async () => {
    const native = new DatabaseSync(filename);
    native.exec("CREATE TRIGGER block_answer BEFORE INSERT ON progress_learning BEGIN SELECT RAISE(ABORT, 'write blocked'); END;");
    session.store.set(openLearningQuestionAtom, 1);
    const before = ready().snapshot;
    expect(await record(1, true)).toBe(false);
    expect(ready().snapshot.learning).toEqual([]);
    expect(ready().snapshot.revision).toBe(before.revision);
    const unsavedDetail = session.store.get(learningDetailAtom)!;
    expect(unsavedDetail.choices.every((choice) => choice.feedback === null)).toBe(true);
    expect(session.store.get(pendingAtom)).toBe(false);
    native.exec('DROP TRIGGER block_answer');
    native.close();
    expect(await record(1, true)).toBe(true);
  });

  it('retains the first answer during duplicate activation and rejects backend overwrites', async () => {
    session.store.set(openLearningQuestionAtom, 1);
    const index = ready().bank.questions[0]!.answers.findIndex((choice) => choice.correct);
    const first = session.store.set(answerLearningAtom, {
      questionId: 1,
      answerIndex: index,
    });
    const second = session.store.set(answerLearningAtom, {
      questionId: 1,
      answerIndex: index,
    });
    expect(await first).toBe(true);
    expect(await second).toBe(false);
    expect(session.store.get(actionErrorAtom)).toBeNull();
    const before = ready().snapshot;
    await expect(session.store.set(commitAtom, [{
      kind: 'putLearning',
      answer: before.learning[0]!,
    }])).rejects.toThrow();
    expect(ready().snapshot.learning).toEqual(before.learning);
  });

  it('cancels or rolls back reset and clears learning only after a confirmed commit', async () => {
    await record(1, true);
    await record(3, false);
    const startup = ready();
    const run: PracticeRun = {
      id: 'saved-run',
      bankVersion: startup.bank.version,
      createdAt: 100,
      completedAt: null,
      status: 'paused',
      questionIds: startup.bank.questions.slice(0, 60).map((question) => question.id),
      answers: [],
      nextUnanswered: 0,
      viewedPosition: 0,
      elapsedMs: 8000,
      result: null,
    };
    await session.store.set(commitAtom, [{
      kind: 'putRun',
      run,
    }]);
    const before = ready().snapshot;
    expect(await session.store.set(resetLearningAtom)).toBe(false);
    expect(ready().snapshot.learning).toEqual(before.learning);
    session.store.set(learningResetOpenAtom, true);
    session.store.set(learningResetOpenAtom, false);
    expect(ready().snapshot.learning).toEqual(before.learning);
    const native = new DatabaseSync(filename);
    native.exec("CREATE TRIGGER block_reset BEFORE DELETE ON progress_learning WHEN OLD.id = '3' BEGIN SELECT RAISE(ABORT, 'reset blocked'); END;");
    session.store.set(learningResetOpenAtom, true);
    expect(await session.store.set(resetLearningAtom)).toBe(false);
    expect(ready().snapshot.learning).toEqual(before.learning);
    expect(ready().snapshot.runs).toEqual([run]);
    expect(ready().snapshot.revision).toBe(before.revision);
    expect(session.store.get(learningResetOpenAtom)).toBe(true);
    native.exec('DROP TRIGGER block_reset');
    native.close();
    expect(await session.store.set(resetLearningAtom)).toBe(true);
    expect(session.store.get(learningResetOpenAtom)).toBe(false);
    expect(ready().snapshot.learning).toEqual([]);
    expect(ready().snapshot.runs).toEqual([run]);
    expect(ready().snapshot.banks).toEqual(before.banks);
    session.close();
    const reopened = await SqliteProgressStorage.open({ path: filename });
    const saved = await reopened.load();
    expect(saved.learning).toEqual([]);
    expect(saved.runs).toEqual([run]);
    reopened.close();
  });

  it('keeps detail neighbors after answering removes a question from the active filter', async () => {
    session.store.set(learningFilterAtom, 'unanswered');
    await record(2, true);
    expect(session.store.get(learningRowsAtom).some((row) => row.id === 2)).toBe(false);
    expect(session.store.get(learningAdjacentAtom)).toEqual({
      previous: 1,
      next: 3,
    });
    session.store.set(openLearningQuestionAtom, 1);
    expect(session.store.get(learningAdjacentAtom)).toEqual({
      previous: null,
      next: 2,
    });
    session.store.set(learningQuestionIdAtom, null);
    session.store.set(openLearningQuestionAtom, 3);
    expect(session.store.get(learningAdjacentAtom)).toEqual({
      previous: 1,
      next: 4,
    });
  });

  it('keeps historical completion and feedback consistent with the saved question bank', async () => {
    const questions = [{
      id: 1,
      description: 'Original recorded question content',
      answers: [
        {
          text: 'Original correct choice',
          correct: true,
          justification: 'Original explanation',
        },
        {
          text: 'Original wrong choice',
          correct: false,
          justification: '',
        },
      ],
    }];
    const oldBank = await validateBank({
      questions,
      version: createHash('sha256').update(JSON.stringify(questions)).digest('hex'),
    });
    await session.store.set(commitAtom, [
      {
        kind: 'putBank',
        bank: oldBank,
      },
      {
        kind: 'putLearning',
        answer: {
          questionId: 1,
          bankVersion: oldBank.version,
          answerIndex: 0,
          outcome: 'correctly_answered',
        },
      },
    ]);
    session.close();
    session = createAppSession(() => SqliteProgressStorage.open({ path: filename }));
    await session.start();
    session.store.set(openLearningQuestionAtom, 1);
    const detail = session.store.get(learningDetailAtom)!;
    expect(detail.historical).toBe(true);
    expect(detail.description).toBe('Original recorded question content');
    expect(detail.status).toBe('correctly_answered');
    expect(detail.choices[0]!.feedback).toEqual({
      selected: true,
      correct: true,
      justification: 'Original explanation',
    });
    const currentDescription = ready().bank.questions[0]!.description;
    expect(session.store.get(learningRowsAtom)[0]!.description).toBe(currentDescription);
    session.store.set(learningResetOpenAtom, true);
    await session.store.set(resetLearningAtom);
    const reset = session.store.get(learningDetailAtom)!;
    expect(reset.historical).toBe(false);
    expect(reset.description).toBe(currentDescription);
    expect(reset.choices.every((choice) => choice.feedback === null)).toBe(true);
  });
});

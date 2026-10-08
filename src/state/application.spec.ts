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
import { createFixtureSet } from '../data/question-set.fixture';
import { createQuestionSet } from '../data/question-set';
import { StorageConflictError } from '../data/storage';
import {
  actionErrorAtom,
  commitAtom,
  createAppSession,
  pendingAtom,
  loadQuestionSetAtom,
  refreshProgressAtom,
  startupAtom,
  setInfoAtom,
} from './application';
import type { AppSession } from './application';
import {
  learningFilterAtom,
  learningFocusedIdAtom,
  learningQueryAtom,
  learningQuestionIdAtom,
} from './learning-state';
import { openLearningQuestionAtom } from './learning';
import {
  practiceOwnedAtom,
  practiceSelectedIdAtom,
} from './practice';

let directory: string;
const sessions: AppSession[] = [];

beforeEach(async () => {
  await mkdir('tmp', { recursive: true });
  directory = await mkdtemp('tmp/state-spec-');
});

afterEach(async () => {
  for (const session of sessions.splice(0)) {
    session.close();
  }
  await rm(directory, {
    recursive: true,
    force: true,
  });
});

function newSession() {
  const session = createAppSession(() => SqliteProgressStorage.open({ path: path.join(directory, 'progress.sqlite') }));
  sessions.push(session);
  return session;
}

describe('Jotai committed progress projections', () => {
  it('counts only answers without either an answer-level or shared explanation', async () => {
    const set = await createQuestionSet([
      {
        id: 1,
        shared: 'Shared source explanation',
        explanations: ['', '', ''],
      },
      {
        id: 2,
        shared: '',
        explanations: ['Own source explanation', ''],
      },
      {
        id: 3,
        shared: undefined,
        explanations: ['', ''],
      },
    ].map(({
      id, shared, explanations,
    }) => ({
      id,
      description: `Question ${id}`,
      justification: shared,
      answers: explanations.map((justification, index) => ({
        text: `Choice ${index}`,
        correct: index === 0,
        justification,
      })),
    })), {
      name: 'Explanation coverage',
      source: 'file',
      loadedAt: 0,
    });
    const current = newSession();
    await current.start();
    await current.store.set(commitAtom, [{
      kind: 'replaceSet',
      set,
    }]);
    expect(current.store.get(setInfoAtom)).toEqual({
      questionCount: 3,
      answerCount: 7,
      missingExplanationCount: 3,
    });
    current.close();
    const reopened = newSession();
    await reopened.start();
    expect(reopened.store.get(setInfoAtom)!.missingExplanationCount).toBe(3);
  });

  it('hydrates existing records and does not overwrite them with initial empty state', async () => {
    const currentSet = await createFixtureSet(4);
    const storage = await SqliteProgressStorage.open({ path: path.join(directory, 'progress.sqlite') });
    await storage.commit({
      expectedRevision: 0,
      changes: [{
        kind: 'seedSet',
        set: currentSet,
      }],
    });
    storage.close();
    const first = newSession();
    await first.start();
    const loaded = first.store.get(startupAtom);
    if (loaded.status !== 'ready') {
      throw new Error('Expected real SQLite startup to succeed');
    }
    const question = loaded.set.questions[0]!;
    const answer = {
      questionId: question.id,
      answerIndices: [question.answers.findIndex((choice) => choice.correct)],
      outcome: 'correctly_answered' as const,
    };
    await first.store.set(commitAtom, [{
      kind: 'putLearning',
      answer,
    }]);
    first.close();
    const reopened = newSession();
    expect(reopened.store.get(startupAtom).status).toBe('loading');
    await reopened.start();
    const hydrated = reopened.store.get(startupAtom);
    expect(hydrated.status).toBe('ready');
    if (hydrated.status === 'ready') {
      expect(hydrated.snapshot.learning).toEqual([answer]);
      expect(hydrated.set).toEqual(currentSet);
      expect(hydrated.snapshot.revision).toBe(2);
    }
  });

  it('retains the old projection on a stale-write failure and clears pending state', async () => {
    const session = newSession();
    await session.start();
    const before = session.store.get(startupAtom);
    if (before.status !== 'ready') {
      throw new Error('Expected real SQLite startup to succeed');
    }
    const outside = await SqliteProgressStorage.open({ path: path.join(directory, 'progress.sqlite') });
    await outside.commit({
      expectedRevision: before.snapshot.revision,
      changes: [{ kind: 'clearLearning' }],
    });
    outside.close();
    await expect(session.store.set(commitAtom, [{ kind: 'clearLearning' }])).rejects.toThrow(StorageConflictError);
    expect(session.store.get(startupAtom)).toBe(before);
    expect(session.store.get(pendingAtom)).toBe(false);
    expect(session.store.get(actionErrorAtom)).not.toBeNull();
  });

  it('shows startup errors without inventing ready empty progress, and permits a real reopen', async () => {
    const occupied = path.join(directory, 'blocked');
    await mkdir(occupied);
    const session = createAppSession(() => SqliteProgressStorage.open({ path: occupied }));
    sessions.push(session);
    await session.start();
    expect(session.store.get(startupAtom).status).toBe('error');
    await rm(occupied, { recursive: true });
    await session.start();
    expect(session.store.get(startupAtom).status).toBe('ready');
  });

  it('lets concurrent first launches converge on one seeded set without overwriting it', async () => {
    const first = newSession();
    const second = newSession();
    await Promise.all([first.start(), second.start()]);
    const left = first.store.get(startupAtom);
    const right = second.store.get(startupAtom);
    if (left.status !== 'ready' || right.status !== 'ready') {
      throw new Error('Concurrent startup did not initialize');
    }
    expect(left.set).toEqual(right.set);
    expect(left.snapshot.revision).toBe(1);
    expect(right.snapshot.revision).toBe(1);
  });

  it('replaces a set without checkpointing deleted practice and resets learning context', async () => {
    const session = newSession();
    await session.start();
    session.store.set(learningQueryAtom, 'demo');
    session.store.set(learningFilterAtom, 'unanswered');
    session.store.set(openLearningQuestionAtom, 1);
    await session.practice.start();
    const native = new DatabaseSync(path.join(directory, 'progress.sqlite'));
    native.exec("CREATE TRIGGER block_checkpoint BEFORE UPDATE ON progress_runs BEGIN SELECT RAISE(ABORT, 'checkpoint must not run'); END;");
    const incoming = await createFixtureSet(5);
    expect(await session.store.set(loadQuestionSetAtom, incoming)).toBe(true);
    const loaded = session.store.get(startupAtom);
    if (loaded.status !== 'ready') throw new Error('Replacement lost ready state');
    expect(loaded.set.questions).toEqual(incoming.questions);
    expect(loaded.snapshot.runs).toEqual([]);
    expect(loaded.snapshot.owners).toEqual([]);
    expect(session.store.get(practiceOwnedAtom)).toBe(false);
    expect(session.store.get(practiceSelectedIdAtom)).toBeNull();
    expect(session.store.get(learningQueryAtom)).toBe('');
    expect(session.store.get(learningFilterAtom)).toBe('all');
    expect(session.store.get(learningFocusedIdAtom)).toBeNull();
    expect(session.store.get(learningQuestionIdAtom)).toBeNull();
    native.close();
  });

  it('resets learning context on another session replacement and on repeated identical loads', async () => {
    const session = newSession();
    await session.start();
    const incoming = await createFixtureSet(2);
    await session.store.set(loadQuestionSetAtom, incoming);
    const before = session.store.get(startupAtom);
    if (before.status !== 'ready') throw new Error('Expected loaded set');
    session.store.set(learningQueryAtom, 'old search');
    session.store.set(openLearningQuestionAtom, 1);
    const outside = await SqliteProgressStorage.open({ path: path.join(directory, 'progress.sqlite') });
    await outside.commit({
      expectedRevision: before.snapshot.revision,
      changes: [{
        kind: 'replaceSet',
        set: {
          ...incoming,
          loadedAt: before.set.loadedAt + 1,
        },
      }],
    });
    outside.close();
    await session.store.set(refreshProgressAtom);
    expect(session.store.get(learningQueryAtom)).toBe('');
    expect(session.store.get(learningQuestionIdAtom)).toBeNull();
    session.store.set(learningQueryAtom, 'another search');
    expect(await session.store.set(loadQuestionSetAtom, incoming)).toBe(true);
    expect(session.store.get(learningQueryAtom)).toBe('');
  });

  it('retains committed progress and learning context when a replacement transaction fails', async () => {
    const session = newSession();
    await session.start();
    await session.practice.start();
    session.store.set(learningQueryAtom, 'keep this search');
    const before = session.store.get(startupAtom);
    const native = new DatabaseSync(path.join(directory, 'progress.sqlite'));
    native.exec("CREATE TRIGGER block_replace BEFORE DELETE ON progress_runs BEGIN SELECT RAISE(ABORT, 'replacement blocked'); END;");
    expect(await session.store.set(loadQuestionSetAtom, await createFixtureSet(2))).toBe(false);
    expect(session.store.get(startupAtom)).toBe(before);
    expect(session.store.get(learningQueryAtom)).toBe('keep this search');
    expect(session.store.get(pendingAtom)).toBe(false);
    expect(session.store.get(actionErrorAtom)).toContain('replacement blocked');
    native.close();
  });
});

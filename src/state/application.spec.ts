import {
  mkdir,
  mkdtemp,
  rm,
} from 'node:fs/promises';
import path from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { SqliteProgressStorage } from '../cli/sqlite';
import { StorageConflictError } from '../data/storage';
import {
  actionErrorAtom,
  commitAtom,
  createAppSession,
  pendingAtom,
  startupAtom,
} from './application';
import type { AppSession } from './application';

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
  it('hydrates existing records and does not overwrite them with initial empty state', async () => {
    const first = newSession();
    await first.start();
    const loaded = first.store.get(startupAtom);
    if (loaded.status !== 'ready') {
      throw new Error('Expected real SQLite startup to succeed');
    }
    const question = loaded.bank.questions[0]!;
    const answer = {
      questionId: question.id,
      bankVersion: loaded.bank.version,
      answerIndex: question.answers.findIndex((choice) => choice.correct),
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
});

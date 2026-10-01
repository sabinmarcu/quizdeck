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
  vi,
} from 'vitest';
import { createFixtureSet } from '../data/question-set.fixture';
import type { QuestionSet } from '../data/question-set';
import { StorageConflictError } from '../data/storage';
import type { ProgressStorage } from '../data/storage';
import { SqliteProgressStorage } from './sqlite';

let directory: string;
let filename: string;
let set: QuestionSet;
const opened: ProgressStorage[] = [];

beforeEach(async () => {
  await mkdir('tmp', { recursive: true });
  directory = await mkdtemp('tmp/sqlite-spec-');
  filename = path.join(directory, 'progress.sqlite');
  set = await createFixtureSet();
});

afterEach(async () => {
  for (const storage of opened.splice(0)) {
    storage.close();
  }
  await rm(directory, {
    recursive: true,
    force: true,
  });
});

function correctAnswer(questionId: number) {
  const question = set.questions.find((entry) => entry.id === questionId)!;
  return {
    questionId,
    answerIndex: question.answers.findIndex((answer) => answer.correct),
    outcome: 'correctly_answered' as const,
  };
}

async function openSeeded() {
  const storage = await SqliteProgressStorage.open({ path: filename });
  opened.push(storage);
  await storage.commit({
    expectedRevision: 0,
    changes: [{
      kind: 'seedSet',
      set,
    }],
  });
  return storage;
}

describe('SQLite progress durability', () => {
  it('keeps a set and recorded outcomes through closing and reopening', async () => {
    const storage = await openSeeded();
    await storage.commit({
      expectedRevision: 1,
      changes: [{
        kind: 'putLearning',
        answer: correctAnswer(1),
      }],
    });
    storage.close();
    const reopened = await SqliteProgressStorage.open({ path: filename });
    opened.push(reopened);
    const snapshot = await reopened.load();
    expect(snapshot.revision).toBe(2);
    expect(snapshot.currentSet).toEqual(set);
    expect(snapshot.learning).toEqual([correctAnswer(1)]);
  });

  it('captures a seed before asynchronous validation', async () => {
    const storage = await SqliteProgressStorage.open({ path: filename });
    opened.push(storage);
    const input = {
      expectedRevision: 0,
      changes: [{
        kind: 'seedSet' as const,
        set: structuredClone(set),
      }],
    };
    const committed = storage.commit(input);
    (input.changes[0]!.set.questions as unknown as { description: string }[])[0]!.description = 'Changed after commit started';
    const snapshot = await committed;
    expect(snapshot.currentSet?.questions[0]?.description).toBe('Question 1');
  });

  it('rolls back a native failure after the first record write and does not publish it', async () => {
    const storage = await openSeeded();
    const native = new DatabaseSync(filename);
    native.exec(`
      CREATE TRIGGER fail_second BEFORE INSERT ON progress_learning
      WHEN NEW.id = '2' BEGIN SELECT RAISE(ABORT, 'injected storage failure'); END;
    `);
    native.close();
    let publications = 0;
    storage.subscribe(() => { publications += 1; });
    await expect(storage.commit({
      expectedRevision: 1,
      changes: [
        {
          kind: 'putLearning',
          answer: correctAnswer(1),
        },
        {
          kind: 'putLearning',
          answer: correctAnswer(2),
        },
      ],
    })).rejects.toThrow();
    storage.close();
    const reopened = await SqliteProgressStorage.open({ path: filename });
    opened.push(reopened);
    expect((await reopened.load()).learning).toEqual([]);
    expect((await reopened.load()).revision).toBe(1);
    expect(publications).toBe(0);
  });

  it('rejects a stale write from a second database connection without losing the first answer', async () => {
    const first = await openSeeded();
    const second = await SqliteProgressStorage.open({ path: filename });
    opened.push(second);
    const stale = await second.load();
    await first.commit({
      expectedRevision: 1,
      changes: [{
        kind: 'putLearning',
        answer: correctAnswer(1),
      }],
    });
    await expect(second.commit({
      expectedRevision: stale.revision,
      changes: [{
        kind: 'putLearning',
        answer: correctAnswer(2),
      }],
    })).rejects.toThrow(StorageConflictError);
    expect((await second.load()).learning).toEqual([correctAnswer(1)]);
  });

  it('allows exactly one concurrent seed', async () => {
    const first = await SqliteProgressStorage.open({ path: filename });
    const second = await SqliteProgressStorage.open({ path: filename });
    opened.push(first, second);
    await Promise.all([first.load(), second.load()]);
    await first.commit({
      expectedRevision: 0,
      changes: [{
        kind: 'seedSet',
        set,
      }],
    });
    await expect(second.commit({
      expectedRevision: 0,
      changes: [{
        kind: 'seedSet',
        set,
      }],
    })).rejects.toThrow(StorageConflictError);
    expect((await second.load()).currentSet).toEqual(set);
  });

  it('rejects unsupported versions without deleting existing progress', async () => {
    const storage = await openSeeded();
    await storage.commit({
      expectedRevision: 1,
      changes: [{
        kind: 'putLearning',
        answer: correctAnswer(1),
      }],
    });
    storage.close();
    const native = new DatabaseSync(filename);
    native.exec("UPDATE progress_metadata SET value = '2' WHERE key = 'schemaVersion'");
    await expect(SqliteProgressStorage.open({ path: filename })).rejects.toThrow();
    expect(native.prepare('SELECT COUNT(*) AS count FROM progress_learning').get()?.count).toBe(1);
    expect(native.prepare("SELECT value FROM progress_metadata WHERE key = 'schemaVersion'").get()?.value).toBe('2');
    native.close();
  });

  it('rejects records that reference questions absent from the set', async () => {
    const storage = await openSeeded();
    storage.close();
    const native = new DatabaseSync(filename);
    native.prepare('INSERT INTO progress_learning VALUES (?, ?)').run('71', JSON.stringify({
      ...correctAnswer(1),
      questionId: 71,
    }));
    await expect(SqliteProgressStorage.open({ path: filename })).rejects.toThrow();
    expect(native.prepare('SELECT payload FROM progress_learning WHERE id = ?').get('71')?.payload).toContain('71');
    native.close();
  });

  it('rejects a stored set with an invalid question count', async () => {
    const storage = await openSeeded();
    storage.close();
    const native = new DatabaseSync(filename);
    const corrupted = structuredClone(set) as { questionCount: number };
    corrupted.questionCount += 1;
    native.prepare('UPDATE progress_set SET payload = ? WHERE id = 1').run(JSON.stringify(corrupted));
    await expect(SqliteProgressStorage.open({ path: filename })).rejects.toThrow();
    expect(native.prepare('SELECT payload FROM progress_set WHERE id = 1').get()?.payload).toContain('"questionCount":71');
    native.close();
  });

  it('rejects a stored set with an invalid content hash', async () => {
    const storage = await openSeeded();
    storage.close();
    const native = new DatabaseSync(filename);
    const corrupted = structuredClone(set) as unknown as {
      questions: { description: string }[];
    };
    corrupted.questions[0]!.description = 'Changed question';
    native.prepare('UPDATE progress_set SET payload = ? WHERE id = 1').run(JSON.stringify(corrupted));
    await expect(SqliteProgressStorage.open({ path: filename })).rejects.toThrow();
    expect(native.prepare('SELECT payload FROM progress_set WHERE id = 1').get()?.payload).toContain('Changed question');
    native.close();
  });

  it('notifies subscribers when another connection commits and stops after unsubscription or close', async () => {
    vi.useFakeTimers();
    try {
      const observer = await openSeeded();
      const writer = await SqliteProgressStorage.open({ path: filename });
      opened.push(writer);
      let publications = 0;
      const unsubscribe = observer.subscribe(() => { publications += 1; });

      await writer.commit({
        expectedRevision: 1,
        changes: [{
          kind: 'putLearning',
          answer: correctAnswer(1),
        }],
      });
      await vi.advanceTimersByTimeAsync(1000);

      expect(publications).toBe(1);
      expect((await observer.load()).learning).toEqual([correctAnswer(1)]);

      unsubscribe();
      await writer.commit({
        expectedRevision: 2,
        changes: [{
          kind: 'putLearning',
          answer: correctAnswer(2),
        }],
      });
      await vi.advanceTimersByTimeAsync(1000);
      expect(publications).toBe(1);

      observer.subscribe(() => { publications += 1; });
      observer.close();
      await writer.commit({
        expectedRevision: 3,
        changes: [{
          kind: 'putLearning',
          answer: correctAnswer(3),
        }],
      });
      await vi.advanceTimersByTimeAsync(1000);
      expect(publications).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

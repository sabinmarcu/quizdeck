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
import {
  createAppSession,
  startupAtom,
  pendingAtom,
  actionErrorAtom,
} from './application';
import type { AppSession } from './application';
import {
  practiceErrorAtom,
  practiceHistoryAtom,
  practiceOwnedAtom,
  practiceReportAtom,
  practiceSelectedIdAtom,
  practiceViewAtom,
} from './practice';

let directory: string;
let filename: string;
let monotonic = 0;
let wall = 100_000;
const sessions: AppSession[] = [];

beforeEach(async () => {
  await mkdir('tmp', { recursive: true });
  directory = await mkdtemp('tmp/practice-spec-');
  filename = path.join(directory, 'progress.sqlite');
  monotonic = 0;
  wall = 100_000;
});
afterEach(async () => {
  for (const current of sessions.splice(0)) {
    current.close();
  }
  await rm(directory, {
    recursive: true,
    force: true,
  });
});

async function session(ownerId = 'session-a') {
  const current = createAppSession(() => SqliteProgressStorage.open({ path: filename }), {
    practice: {
      now: () => wall,
      monotonic: () => monotonic,
      ownerId,
      automaticCheckpoints: false,
    },
  });
  sessions.push(current);
  await current.start();
  return current;
}

function snapshot(current: AppSession) {
  const startup = current.store.get(startupAtom);
  if (startup.status !== 'ready') {
    throw new Error('Native storage did not initialize');
  }
  return startup.snapshot;
}

async function answer(current: AppSession, answerIndex = 0) {
  const view = current.store.get(practiceViewAtom)!;
  return current.practice.answer({
    runId: view.runId,
    position: view.position,
    answerIndex,
  });
}

describe('native persisted practice sessions', () => {
  it('creates sixty saved unique questions and withholds feedback, IDs, and partial reports', async () => {
    const current = await session();
    expect(await current.practice.start()).toBe(true);
    const saved = snapshot(current).runs[0]!;
    expect(saved.questionIds).toHaveLength(60);
    expect(new Set(saved.questionIds).size).toBe(60);
    const view = current.store.get(practiceViewAtom)!;
    expect(view.position).toBe(0);
    expect(view.canAnswer).toBe(true);
    expect('questionId' in view).toBe(false);
    expect(view.choices.every((choice) => !('correct' in choice) && !('justification' in choice))).toBe(true);
    expect(current.store.get(practiceReportAtom)).toBeNull();
    expect(current.store.get(practiceHistoryAtom)[0]!.score).toBeNull();
    expect(snapshot(current).learning).toEqual([]);
  });

  it('accumulates eight plus twelve active minutes without counting a two-hour pause', async () => {
    const current = await session();
    await current.practice.start();
    monotonic += 8 * 60 * 1000;
    wall += 8 * 60 * 1000;
    expect(await current.practice.pause()).toBe(true);
    expect(snapshot(current).runs[0]!.elapsedMs).toBe(8 * 60 * 1000);
    monotonic += 2 * 60 * 60 * 1000;
    wall += 2 * 60 * 60 * 1000;
    await current.practice.resume();
    monotonic += 12 * 60 * 1000;
    wall += 12 * 60 * 1000;
    await current.practice.checkpoint();
    expect(snapshot(current).runs[0]!.elapsedMs).toBe(20 * 60 * 1000);
    await current.practice.checkpoint();
    expect(snapshot(current).runs[0]!.elapsedMs).toBe(20 * 60 * 1000);
    await current.practice.pause();
    expect(snapshot(current).runs[0]!.elapsedMs).toBe(20 * 60 * 1000);
  });

  it('measures a monotonic interval even when the system clock jumps', async () => {
    const current = await session();
    await current.practice.start();
    monotonic += 2000;
    wall += 10 * 60 * 60 * 1000;
    await current.practice.checkpoint();
    expect(snapshot(current).runs[0]!.elapsedMs).toBe(2000);
    monotonic += 3000;
    wall -= 9 * 60 * 60 * 1000;
    await current.practice.pause();
    expect(snapshot(current).runs[0]!.elapsedMs).toBe(5000);
  });

  it('allows previous-choice inspection but not editing or skipping, retaining the saved frontier', async () => {
    const current = await session();
    await current.practice.start();
    await answer(current);
    await answer(current);
    const before = snapshot(current).runs[0]!;
    await current.practice.view(0);
    const view = current.store.get(practiceViewAtom)!;
    expect(view.canAnswer).toBe(false);
    expect(view.choices[0]!.selected).toBe(true);
    expect(await answer(current, 1)).toBe(false);
    expect(snapshot(current).runs[0]!.answers).toEqual(before.answers);
    expect(await current.practice.view(3)).toBe(false);
    expect(snapshot(current).runs[0]!.viewedPosition).toBe(0);
    await current.practice.view(2);
    expect(current.store.get(practiceViewAtom)!.canAnswer).toBe(true);
    expect(snapshot(current).runs[0]!.nextUnanswered).toBe(2);
    await current.practice.leave();
    const { id } = before;
    await current.practice.open(id);
    expect(snapshot(current).runs[0]!.questionIds).toEqual(before.questionIds);
    expect(snapshot(current).runs[0]!.nextUnanswered).toBe(2);
  });

  it('does not let simultaneous activations answer two questions', async () => {
    const current = await session();
    await current.practice.start();
    const first = answer(current);
    const duplicate = answer(current, 1);
    expect(await first).toBe(true);
    expect(await duplicate).toBe(false);
    expect(snapshot(current).runs[0]!.answers).toHaveLength(1);
    expect(current.store.get(practiceErrorAtom)).toBeNull();
  });

  it('preserves the prior answer state after a native write failure, then permits retry', async () => {
    const current = await session();
    await current.practice.start();
    const native = new DatabaseSync(filename);
    native.exec("CREATE TRIGGER block_run BEFORE UPDATE ON progress_runs BEGIN SELECT RAISE(ABORT, 'run save blocked'); END;");
    expect(await answer(current)).toBe(false);
    expect(snapshot(current).runs[0]!.answers).toEqual([]);
    expect(current.store.get(practiceReportAtom)).toBeNull();
    native.exec('DROP TRIGGER block_run');
    native.close();
    expect(await answer(current)).toBe(true);
    expect(snapshot(current).runs[0]!.answers).toHaveLength(1);
  });

  it('rejects a concurrent owner and recovers a crashed session from its last saved checkpoint', async () => {
    const first = await session('first');
    await first.practice.start();
    monotonic += 1000;
    wall += 1000;
    await first.practice.checkpoint();
    const id = first.store.get(practiceSelectedIdAtom)!;
    const second = await session('second');
    expect(await second.practice.open(id)).toBe(false);
    expect(second.store.get(practiceOwnedAtom)).toBe(false);
    expect(snapshot(second).runs[0]!.answers).toEqual([]);
    first.close();
    monotonic += 3_600_000;
    wall += 3_600_000;
    expect(await second.practice.open(id)).toBe(true);
    expect(snapshot(second).runs[0]!.elapsedMs).toBe(1000);
    monotonic += 500;
    await second.practice.pause();
    expect(snapshot(second).runs[0]!.elapsedMs).toBe(1500);
  });

  it('completes on answer sixty and restores its immutable report and other saved runs', async () => {
    const current = await session();
    await current.practice.start();
    const id = current.store.get(practiceSelectedIdAtom)!;
    const ids = [...snapshot(current).runs[0]!.questionIds];
    for (let position = 0; position < 60; position += 1) {
      monotonic += 100;
      wall += 100;
      expect(await answer(current)).toBe(true);
    }
    const report = current.store.get(practiceReportAtom)!;
    expect(report.questions.map((question) => question.questionId)).toEqual(ids);
    const positions = Array.from({ length: 60 }, (_, index) => index + 1);
    expect(report.questions.map((question) => question.position)).toEqual(positions);
    expect(report.elapsedMs).toBe(6000);
    expect(current.store.get(practiceViewAtom)).toBeNull();
    expect(snapshot(current).owners).toEqual([]);
    monotonic += 50_000;
    wall += 50_000;
    await current.practice.checkpoint();
    expect(current.store.get(practiceReportAtom)!.elapsedMs).toBe(6000);
    await current.practice.start();
    expect(snapshot(current).runs).toHaveLength(2);
    await current.practice.pause();
    current.close();
    const reopened = await session('reopened');
    await reopened.practice.open(id);
    expect(reopened.store.get(practiceReportAtom)).toEqual(report);
    expect(snapshot(reopened).learning).toEqual([]);
  });

  it('does not expose a report if the final answer transaction fails', async () => {
    const current = await session();
    await current.practice.start();
    for (let position = 0; position < 59; position += 1) {
      await answer(current);
    }
    const native = new DatabaseSync(filename);
    native.exec(`
      CREATE TRIGGER block_completion BEFORE UPDATE ON progress_runs
      WHEN json_array_length(NEW.payload, '$.answers') = 60
      BEGIN SELECT RAISE(ABORT, 'completion save failed'); END;
    `);
    const before = snapshot(current).runs[0]!;
    expect(await answer(current)).toBe(false);
    expect(snapshot(current).runs[0]!.answers).toEqual(before.answers);
    expect(snapshot(current).runs[0]!.status).toBe('active');
    expect(current.store.get(practiceReportAtom)).toBeNull();
    expect(current.store.get(practiceViewAtom)!.position).toBe(59);
    native.exec('DROP TRIGGER block_completion');
    native.close();
    expect(await answer(current)).toBe(true);
    expect(current.store.get(practiceReportAtom)!.questions).toHaveLength(60);
    expect(snapshot(current).owners).toEqual([]);
  });

  it('does not pause or abandon ownership when leaving is rejected during an answer save', async () => {
    const current = await session();
    await current.practice.start();
    const saving = answer(current);
    expect(await current.practice.leave()).toBe(false);
    expect(await saving).toBe(true);
    expect(current.store.get(practiceOwnedAtom)).toBe(true);
    expect(snapshot(current).runs[0]!.status).toBe('active');
    monotonic += 1000;
    await current.practice.checkpoint();
    expect(snapshot(current).runs[0]!.elapsedMs).toBe(1000);
    expect(snapshot(current).runs[0]!.answers).toHaveLength(1);
  });

  it('persists background time without flashing save state or clearing a user-visible error', async () => {
    const current = await session();
    await current.practice.start();
    const indicators: boolean[] = [];
    const unsubscribe = current.store.sub(pendingAtom, () => {
      indicators.push(current.store.get(pendingAtom));
    });
    current.store.set(actionErrorAtom, 'Earlier action error remains visible');
    monotonic += 1000;
    await current.practice.checkpoint();
    unsubscribe();
    expect(indicators).toEqual([]);
    expect(current.store.get(actionErrorAtom)).toBe('Earlier action error remains visible');
    expect(snapshot(current).runs[0]!.elapsedMs).toBe(1000);
  });
});

import {
  mkdir,
  mkdtemp,
  rm,
} from 'node:fs/promises';
import path from 'node:path';
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { SqliteProgressStorage } from '../cli/sqlite';
import {
  createAppSession,
  startupAtom,
} from './application';
import type { AppSession } from './application';
import { practiceSelectedIdAtom } from './practice-session';

const sessions: AppSession[] = [];
let directory: string | undefined;

afterEach(async () => {
  for (const session of sessions.splice(0)) {
    session.close();
  }
  vi.unstubAllGlobals();
  if (directory) {
    await rm(directory, {
      recursive: true,
      force: true,
    });
    directory = undefined;
  }
});

describe('practice identities on LAN HTTP', () => {
  it('persists independent runs and enforces session ownership without secure-context crypto APIs', async () => {
    vi.stubGlobal('crypto', {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });
    await mkdir('tmp', { recursive: true });
    directory = await mkdtemp('tmp/practice-lan-spec-');
    const filename = path.join(directory, 'progress.sqlite');
    for (let index = 0; index < 2; index += 1) {
      const session = createAppSession(() => SqliteProgressStorage.open({ path: filename }), {
        practice: {
          now: () => 100_000,
          monotonic: () => 0,
          automaticCheckpoints: false,
        },
      });
      sessions.push(session);
      await session.start();
      expect(await session.practice.start()).toBe(true);
    }
    const [first, second] = sessions;
    const storage = await SqliteProgressStorage.open({ path: filename });
    try {
      const snapshot = await storage.load();
      expect(snapshot.runs).toHaveLength(2);
      expect(snapshot.runs[0]!.id).not.toBe(snapshot.runs[1]!.id);
      expect(snapshot.owners).toHaveLength(2);
      expect(snapshot.owners[0]!.ownerId).not.toBe(snapshot.owners[1]!.ownerId);
      const firstRunId = first!.store.get(practiceSelectedIdAtom)!;
      expect(await second!.practice.open(firstRunId)).toBe(false);
      expect(await first!.practice.answer({
        runId: firstRunId,
        position: 0,
        answerIndex: 0,
      })).toBe(true);
      expect(await first!.practice.pause()).toBe(true);
      expect(await second!.practice.open(firstRunId)).toBe(true);
      const resumed = second!.store.get(startupAtom);
      expect(resumed.status).toBe('ready');
      if (resumed.status === 'ready') {
        expect(resumed.snapshot.runs.find((run) => run.id === firstRunId)!.nextUnanswered).toBe(1);
      }
    } finally {
      storage.close();
    }
  });
});

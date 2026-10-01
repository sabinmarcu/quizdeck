import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { StatementSync } from 'node:sqlite';
import { validateQuestionSet } from '../data/question-set';
import type { QuestionSet } from '../data/question-set';
import {
  emptySnapshot,
  validateSnapshot,
} from '../data/records';
import type { Snapshot } from '../data/records';
import {
  applyTransaction,
  StorageConflictError,
  transactionSchema,
} from '../data/storage';
import type {
  ProgressStorage,
  Transaction,
} from '../data/storage';
import { resolveProgressStoragePath } from './path';

const tableNames = ['progress_metadata', 'progress_set', 'progress_learning', 'progress_runs', 'progress_owners'];

interface PersistedRow { id: string; payload: string }

interface CachedSet {
  serialized: string;
  set: QuestionSet;
}

interface CapturedSnapshot {
  revision: number;
  set: string | null;
  learning: unknown[];
  runs: unknown[];
  owners: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function parseRevision(value: string | undefined): number {
  if (!value || !/^\d+$/u.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error('Persisted progress revision is invalid.');
  }
  return Number(value);
}

function parsePayload(row: PersistedRow, identity: 'questionId' | 'id' | 'runId'): unknown {
  let value: unknown;
  try {
    value = JSON.parse(row.payload);
  } catch {
    throw new Error(`Persisted progress record ${row.id} is not valid JSON.`);
  }
  if (!isRecord(value) || String(value[identity]) !== row.id) {
    throw new Error(`Persisted progress record ${row.id} does not match its identity.`);
  }
  return value;
}

async function prepareSet(transaction: Transaction): Promise<QuestionSet | null> {
  const setChanges = transaction.changes.filter((change) => (
    change.kind === 'seedSet' || change.kind === 'replaceSet'
  ));
  if (setChanges.length === 0) {
    return null;
  }
  if (setChanges.length > 1) {
    throw new Error('A transaction can change the question set only once.');
  }
  const change = setChanges[0];
  if (!change) {
    throw new Error('Question set change is unavailable.');
  }
  if (change.kind === 'replaceSet' && change.set.source !== 'file') {
    throw new Error('Replacement question sets must come from a file.');
  }
  return validateQuestionSet(change.set);
}

function snapshotFrom(captured: CapturedSnapshot, currentSet: QuestionSet | null): Snapshot {
  return validateSnapshot({
    ...emptySnapshot(),
    revision: captured.revision,
    currentSet,
    learning: captured.learning,
    runs: captured.runs,
    owners: captured.owners,
  });
}

export namespace SqliteProgressStorage {
  export interface Options { path: string }
}

export class SqliteProgressStorage implements ProgressStorage {
  public readonly location: string;

  public readonly retention = 'persistent' as const;

  private readonly database: DatabaseSync;

  private readonly dataVersionQuery: StatementSync;

  private readonly listeners = new Set<() => void>();

  private cachedSet: CachedSet | null = null;

  private closed = false;

  private observedDataVersion: number | undefined;

  private dataVersionTimer: NodeJS.Timeout | undefined;

  private constructor({ path: filename }: SqliteProgressStorage.Options) {
    this.location = filename;
    this.database = new DatabaseSync(filename, { timeout: 5000 });
    this.dataVersionQuery = this.database.prepare('PRAGMA data_version');
  }

  public static async open(options: SqliteProgressStorage.Options): Promise<SqliteProgressStorage> {
    await mkdir(path.dirname(options.path), { recursive: true });
    const storage = new SqliteProgressStorage(options);
    try {
      storage.initialize();
      await storage.load();
      return storage;
    } catch (error) {
      storage.close();
      throw error;
    }
  }

  public async load(): Promise<Snapshot> {
    this.assertOpen();
    this.database.exec('BEGIN');
    let captured: CapturedSnapshot;
    try {
      captured = this.capture();
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
    const currentSet = captured.set === null
      ? null
      : await this.parseSet(captured.set);
    return snapshotFrom(captured, currentSet);
  }

  public async commit(input: Transaction): Promise<Snapshot> {
    this.assertOpen();
    const transaction = transactionSchema.parse(input);
    const stagedSet = await prepareSet(transaction);
    await this.load();
    this.assertOpen();
    this.database.exec('BEGIN IMMEDIATE');
    let next: Snapshot;
    try {
      const captured = this.capture();
      if (captured.revision !== transaction.expectedRevision) {
        throw new StorageConflictError();
      }
      const currentSet = this.currentSetFromCache(captured.set);
      const current = snapshotFrom(captured, currentSet);
      next = applyTransaction(current, transaction);
      this.writeChanges(transaction, stagedSet);
      this.setMetadata('revision', String(next.revision));
      this.database.exec('COMMIT');
    } catch (error) {
      if (this.database.isTransaction) {
        this.database.exec('ROLLBACK');
      }
      throw error;
    }
    if (stagedSet) {
      this.cachedSet = {
        serialized: JSON.stringify(stagedSet),
        set: stagedSet,
      };
    }
    this.notifyListeners();
    return next;
  }

  public subscribe(listener: () => void): () => void {
    this.assertOpen();
    const wasEmpty = this.listeners.size === 0;
    this.listeners.add(listener);
    if (wasEmpty) {
      this.startDataVersionMonitor();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopDataVersionMonitor();
      }
    };
  }

  public close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.stopDataVersionMonitor();
    this.listeners.clear();
    this.cachedSet = null;
    this.database.close();
  }

  private startDataVersionMonitor(): void {
    this.observedDataVersion = this.readDataVersion();
    this.dataVersionTimer = setInterval(() => {
      if (this.closed || this.listeners.size === 0) {
        return;
      }
      try {
        const version = this.readDataVersion();
        if (version !== this.observedDataVersion) {
          this.observedDataVersion = version;
          this.notifyListeners();
        }
      } catch {
        this.notifyListeners();
      }
    }, 1000);
    this.dataVersionTimer.unref();
  }

  private stopDataVersionMonitor(): void {
    if (this.dataVersionTimer) {
      clearInterval(this.dataVersionTimer);
      this.dataVersionTimer = undefined;
    }
    this.observedDataVersion = undefined;
  }

  private readDataVersion(): number {
    const value = this.dataVersionQuery.get()?.data_version;
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
      throw new TypeError('SQLite data version is invalid.');
    }
    return value;
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Observers cannot turn a successful database commit into a failed save.
      }
    }
  }

  private initialize(): void {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.database.prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${tableNames.map(() => '?').join(', ')})`,
      ).all(...tableNames);
      if (existing.length === 0) {
        this.database.exec(`
          CREATE TABLE progress_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE progress_set (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL);
          CREATE TABLE progress_learning (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
          CREATE TABLE progress_runs (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
          CREATE TABLE progress_owners (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
        `);
        this.setMetadata('schemaVersion', '1');
        this.setMetadata('revision', '0');
      } else if (existing.length !== tableNames.length) {
        throw new Error('Persisted progress schema is incomplete and cannot be opened safely.');
      }
      this.assertSchema();
      parseRevision(this.metadata('revision'));
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  private assertSchema(): void {
    if (this.metadata('schemaVersion') !== '1') {
      throw new Error('Unsupported or missing persisted progress schema version.');
    }
  }

  private capture(): CapturedSnapshot {
    this.assertSchema();
    return {
      revision: parseRevision(this.metadata('revision')),
      set: this.setPayload(),
      learning: this.rows('progress_learning').map((row) => parsePayload(row, 'questionId')),
      runs: this.rows('progress_runs').map((row) => parsePayload(row, 'id')),
      owners: this.rows('progress_owners').map((row) => parsePayload(row, 'runId')),
    };
  }

  private async parseSet(serialized: string): Promise<QuestionSet> {
    if (this.cachedSet?.serialized === serialized) {
      return this.cachedSet.set;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      throw new Error('Persisted question set is not valid JSON.');
    }
    const set = await validateQuestionSet(parsed);
    this.cachedSet = {
      serialized,
      set,
    };
    return set;
  }

  private currentSetFromCache(serialized: string | null): QuestionSet | null {
    if (serialized === null) {
      return null;
    }
    if (this.cachedSet?.serialized !== serialized) {
      throw new StorageConflictError('Question set changed during preparation. Reload storage.');
    }
    return this.cachedSet.set;
  }

  private setPayload(): string | null {
    const row = this.database.prepare('SELECT payload FROM progress_set WHERE id = 1').get();
    if (!row) {
      return null;
    }
    if (typeof row.payload !== 'string') {
      throw new TypeError('Persisted question set has an invalid payload.');
    }
    return row.payload;
  }

  private rows(table: 'progress_learning' | 'progress_runs' | 'progress_owners'): PersistedRow[] {
    return this.database.prepare(`SELECT id, payload FROM ${table} ORDER BY id`).all().map((row) => {
      if (typeof row.id !== 'string' || typeof row.payload !== 'string') {
        throw new TypeError(`Persisted ${table} row has an invalid shape.`);
      }
      return {
        id: row.id,
        payload: row.payload,
      };
    });
  }

  private metadata(key: 'schemaVersion' | 'revision'): string | undefined {
    const row = this.database.prepare('SELECT value FROM progress_metadata WHERE key = ?').get(key);
    if (!row) {
      return undefined;
    }
    if (typeof row.value !== 'string') {
      throw new TypeError(`Persisted progress ${key} is invalid.`);
    }
    return row.value;
  }

  private setMetadata(key: 'schemaVersion' | 'revision', value: string): void {
    this.database.prepare(
      'INSERT INTO progress_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ).run(key, value);
  }

  private writeChanges(transaction: Transaction, stagedSet: QuestionSet | null): void {
    for (const change of transaction.changes) {
      switch (change.kind) {
        case 'seedSet': {
          if (!stagedSet) {
            throw new Error('Question set seed has not been validated.');
          }
          this.database.prepare('INSERT INTO progress_set (id, payload) VALUES (1, ?)').run(JSON.stringify(stagedSet));
          break;
        }
        case 'replaceSet': {
          if (!stagedSet) {
            throw new Error('Question set replacement has not been validated.');
          }
          this.database.exec(`
            DELETE FROM progress_learning;
            DELETE FROM progress_runs;
            DELETE FROM progress_owners;
          `);
          this.database.prepare(
            'INSERT INTO progress_set (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
          ).run(JSON.stringify(stagedSet));
          break;
        }
        case 'putLearning': {
          this.database.prepare('INSERT INTO progress_learning VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload')
            .run(String(change.answer.questionId), JSON.stringify(change.answer));
          break;
        }
        case 'clearLearning': {
          this.database.exec('DELETE FROM progress_learning');
          break;
        }
        case 'putRun': {
          this.database.prepare('INSERT INTO progress_runs VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload')
            .run(change.run.id, JSON.stringify(change.run));
          break;
        }
        case 'acquireOwner': {
          this.database.prepare('INSERT INTO progress_owners VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload')
            .run(change.owner.runId, JSON.stringify(change.owner));
          break;
        }
        case 'releaseOwner': {
          this.database.prepare('DELETE FROM progress_owners WHERE id = ?').run(change.runId);
          break;
        }
        default: {
          throw new Error('Unsupported storage change');
        }
      }
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('Progress storage is closed.');
    }
  }
}

export async function openInkStorage(): Promise<ProgressStorage> {
  return SqliteProgressStorage.open({ path: resolveProgressStoragePath() });
}

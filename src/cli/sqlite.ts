import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { validateBank } from '../data/bank';
import type { Bank } from '../data/bank';
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

const tableNames = ['progress_metadata', 'progress_banks', 'progress_learning', 'progress_runs', 'progress_owners'];
interface PersistedRow { id: string; payload: string }
interface CachedBank { serialized: string; bank: Bank }
interface CapturedSnapshot {
  revision: number;
  banks: PersistedRow[];
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

function parsePayload(row: PersistedRow, identity: 'questionId' | 'id' | 'runId' | 'version'): unknown {
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

async function prepareBanks(transaction: Transaction): Promise<Map<string, Bank>> {
  const banks = new Map<string, Bank>();
  for (const change of transaction.changes) {
    if (change.kind === 'putBank') {
      banks.set(change.bank.version, await validateBank(change.bank));
    }
  }
  return banks;
}

function snapshotFrom(captured: CapturedSnapshot, banks: ReadonlyMap<string, Bank>): Snapshot {
  return validateSnapshot({
    ...emptySnapshot(),
    revision: captured.revision,
    banks: [...banks.values()].map((bank) => ({
      version: bank.version,
      questionCount: bank.questions.length,
    })),
    learning: captured.learning,
    runs: captured.runs,
    owners: captured.owners,
  }, banks);
}

export namespace SqliteProgressStorage {
  export interface Options { path: string }
}

export class SqliteProgressStorage implements ProgressStorage {
  public readonly location: string;

  public readonly retention = 'persistent' as const;

  private readonly database: DatabaseSync;

  private readonly listeners = new Set<() => void>();

  private readonly bankCache = new Map<string, CachedBank>();

  private closed = false;

  private constructor({ path: filename }: SqliteProgressStorage.Options) {
    this.location = filename;
    this.database = new DatabaseSync(filename, { timeout: 5000 });
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
    const banks = new Map<string, Bank>();
    for (const row of captured.banks) {
      banks.set(row.id, await this.parseBank(row));
    }
    return snapshotFrom(captured, banks);
  }

  public async getBank(version: string): Promise<Bank | undefined> {
    this.assertOpen();
    const row = this.database.prepare('SELECT payload FROM progress_banks WHERE version = ?').get(version);
    if (!row) {
      return undefined;
    }
    if (typeof row.payload !== 'string') {
      throw new TypeError(`Persisted bank ${version} has an invalid payload.`);
    }
    return this.parseBank({
      id: version,
      payload: row.payload,
    });
  }

  public async commit(input: Transaction): Promise<Snapshot> {
    this.assertOpen();
    const transaction = transactionSchema.parse(input);
    const stagedBanks = await prepareBanks(transaction);
    await this.load();
    this.assertOpen();
    this.database.exec('BEGIN IMMEDIATE');
    let next: Snapshot;
    try {
      const captured = this.capture();
      if (captured.revision !== transaction.expectedRevision) {
        throw new StorageConflictError();
      }
      const banks = new Map<string, Bank>();
      for (const row of captured.banks) {
        const cached = this.bankCache.get(row.id);
        if (!cached || cached.serialized !== row.payload) {
          throw new StorageConflictError('Question banks changed during preparation. Reload storage.');
        }
        banks.set(row.id, cached.bank);
      }
      const current = snapshotFrom(captured, banks);
      for (const [version, bank] of stagedBanks) {
        banks.set(version, bank);
      }
      next = applyTransaction(current, transaction, banks);
      this.writeChanges(transaction);
      this.setMetadata('revision', String(next.revision));
      this.database.exec('COMMIT');
    } catch (error) {
      if (this.database.isTransaction) {
        this.database.exec('ROLLBACK');
      }
      throw error;
    }
    for (const [version, bank] of stagedBanks) {
      this.bankCache.set(version, {
        serialized: JSON.stringify(bank),
        bank,
      });
    }
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Observers cannot turn a successful database commit into a failed save.
      }
    }
    return next;
  }

  public subscribe(listener: () => void): () => void {
    this.assertOpen();
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  public close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.listeners.clear();
    this.bankCache.clear();
    this.database.close();
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
          CREATE TABLE progress_banks (version TEXT PRIMARY KEY, payload TEXT NOT NULL);
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
      banks: this.rows('progress_banks'),
      learning: this.rows('progress_learning').map((row) => parsePayload(row, 'questionId')),
      runs: this.rows('progress_runs').map((row) => parsePayload(row, 'id')),
      owners: this.rows('progress_owners').map((row) => parsePayload(row, 'runId')),
    };
  }

  private async parseBank(row: PersistedRow): Promise<Bank> {
    const cached = this.bankCache.get(row.id);
    if (cached?.serialized === row.payload) {
      return cached.bank;
    }
    const parsed = parsePayload(row, 'version');
    const bank = await validateBank(parsed);
    this.bankCache.set(row.id, {
      serialized: row.payload,
      bank,
    });
    return bank;
  }

  private rows(table: 'progress_banks' | 'progress_learning' | 'progress_runs' | 'progress_owners'): PersistedRow[] {
    const identity = table === 'progress_banks' ? 'version' : 'id';
    return this.database.prepare(`SELECT ${identity} AS id, payload FROM ${table} ORDER BY ${identity}`).all().map((row) => {
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

  private writeChanges(transaction: Transaction): void {
    for (const change of transaction.changes) {
      switch (change.kind) {
        case 'putBank': {
          this.database.prepare('INSERT INTO progress_banks VALUES (?, ?) ON CONFLICT(version) DO NOTHING')
            .run(change.bank.version, JSON.stringify(change.bank));
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

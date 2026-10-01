import { z } from 'zod';
import { validateBank } from '../data/bank';
import type { Bank } from '../data/bank';
import {
  emptySnapshot,
  snapshotSchema,
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

const metadataStore = 'metadata';
const banksStore = 'banks';
const snapshotKey = 'snapshot';
export const defaultProgressDatabaseName = 'claude-certification';
const messageSchema = z.strictObject({
  type: z.literal('progress-committed'),
  databaseName: z.string().min(1),
});

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => { resolve(request.result); }, { once: true });
    request.addEventListener('error', () => {
      reject(request.error ?? new Error('IndexedDB request failed.'));
    }, { once: true });
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => { resolve(); }, { once: true });
    transaction.addEventListener('abort', () => {
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
    }, { once: true });
  });
}

async function readSnapshot(database: IDBDatabase): Promise<Snapshot> {
  const transaction = database.transaction(metadataStore, 'readonly');
  const complete = transactionResult(transaction);
  const [value] = await Promise.all([
    requestResult(transaction.objectStore(metadataStore).get(snapshotKey)), complete,
  ]);
  if (value === undefined) {
    throw new Error('Progress storage metadata is missing or corrupt.');
  }
  return snapshotSchema.parse(value);
}

function writeTransaction(
  database: IDBDatabase,
  expected: Snapshot,
  input: Transaction,
  banks: ReadonlyMap<string, Bank>,
  putBanks: readonly Bank[],
): Promise<Snapshot> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([metadataStore, banksStore], 'readwrite');
    const metadata = transaction.objectStore(metadataStore);
    const bankStore = transaction.objectStore(banksStore);
    let failure: unknown;
    let next: Snapshot | undefined;
    const request = metadata.get(snapshotKey);
    request.addEventListener('success', () => {
      try {
        const current = snapshotSchema.parse(request.result);
        if (current.revision !== expected.revision) {
          throw new StorageConflictError();
        }
        next = applyTransaction(validateSnapshot(current, banks), input, banks);
        metadata.put(next, snapshotKey);
        for (const bank of putBanks) {
          bankStore.add(bank);
        }
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    }, { once: true });
    transaction.addEventListener('abort', () => {
      reject(failure ?? transaction.error ?? new Error('Progress transaction was aborted.'));
    }, { once: true });
    transaction.addEventListener('complete', () => {
      if (next) {
        resolve(next);
      } else {
        reject(new Error('Progress transaction completed without a snapshot.'));
      }
    }, { once: true });
  });
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDB.open(name, 1);
    const fail = (error: Error) => {
      settled = true;
      reject(error);
    };
    request.addEventListener('upgradeneeded', (event) => {
      const database = request.result;
      if (!database.objectStoreNames.contains(metadataStore)) {
        database.createObjectStore(metadataStore);
      }
      if (!database.objectStoreNames.contains(banksStore)) {
        database.createObjectStore(banksStore, { keyPath: 'version' });
      }
      if (request.transaction && event.oldVersion === 0) {
        request.transaction.objectStore(metadataStore).put(emptySnapshot(), snapshotKey);
      }
    });
    request.addEventListener('blocked', () => {
      fail(new Error('Progress storage is blocked by another tab. Close the older tab, then reload.'));
    });
    request.addEventListener('error', () => {
      fail(request.error?.name === 'VersionError'
        ? new Error('Progress storage was created by a newer application version.')
        : request.error ?? new Error('IndexedDB could not be opened.'));
    }, { once: true });
    request.addEventListener('success', () => {
      if (settled) {
        request.result.close();
      } else {
        settled = true;
        resolve(request.result);
      }
    }, { once: true });
  });
}

async function requestRetention(): Promise<ProgressStorage['retention']> {
  const { storage } = navigator;
  if (!storage) {
    return 'best-effort';
  }
  try {
    if (await storage.persisted()) {
      return 'persistent';
    }
    return await storage.persist() ? 'persistent' : 'best-effort';
  } catch {
    return 'best-effort';
  }
}

class IndexedProgressStorage implements ProgressStorage {
  public readonly location: string;

  private readonly banks = new Map<string, Bank>();

  private readonly listeners = new Set<() => void>();

  private readonly channel: BroadcastChannel;

  private closed = false;

  public constructor(
    private readonly database: IDBDatabase,
    private readonly databaseName: string,
    public readonly retention: ProgressStorage['retention'],
  ) {
    this.location = `IndexedDB ${databaseName} at ${document.location.origin}`;
    this.channel = new BroadcastChannel(`claude-certification-progress:${databaseName}`);
    this.database.addEventListener('versionchange', () => {
      this.notify();
      this.close();
    });
    this.channel.addEventListener('message', (event: MessageEvent<unknown>) => {
      const message = messageSchema.safeParse(event.data);
      if (message.success && message.data.databaseName === databaseName) {
        this.notify();
      }
    });
  }

  public async getBank(version: string): Promise<Bank | undefined> {
    this.assertOpen();
    const cached = this.banks.get(version);
    if (cached) {
      return cached;
    }
    const transaction = this.database.transaction(banksStore, 'readonly');
    const complete = transactionResult(transaction);
    const [value] = await Promise.all([
      requestResult(transaction.objectStore(banksStore).get(version)), complete,
    ]);
    if (value === undefined) {
      return undefined;
    }
    const bank = await validateBank(value);
    if (bank.version !== version) {
      throw new Error('Persisted bank does not match its catalog identity.');
    }
    this.banks.set(version, bank);
    return bank;
  }

  public async load(): Promise<Snapshot> {
    this.assertOpen();
    const snapshot = await readSnapshot(this.database);
    for (const entry of snapshot.banks) {
      if (!await this.getBank(entry.version)) {
        throw new Error('Persisted bank catalog references a missing snapshot.');
      }
    }
    return validateSnapshot(snapshot, this.banks);
  }

  public async commit(input: Transaction): Promise<Snapshot> {
    this.assertOpen();
    const transaction = transactionSchema.parse(input);
    const staged = new Map<string, Bank>();
    for (const change of transaction.changes) {
      if (change.kind === 'putBank') {
        staged.set(change.bank.version, await validateBank(change.bank));
      }
    }
    const current = await this.load();
    const banks = new Map(this.banks);
    const putBanks: Bank[] = [];
    for (const [version, bank] of staged) {
      if (!banks.has(version)) {
        putBanks.push(bank);
      }
      banks.set(version, bank);
    }
    this.assertOpen();
    const next = await writeTransaction(this.database, current, transaction, banks, putBanks);
    for (const [version, bank] of staged) {
      this.banks.set(version, bank);
    }
    if (!this.closed) {
      this.notify();
      this.channel.postMessage({
        type: 'progress-committed',
        databaseName: this.databaseName,
      });
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
    this.banks.clear();
    this.channel.close();
    this.database.close();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Observers cannot turn a successful database commit into a failed save.
      }
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('Progress storage is closed.');
    }
  }
}

export namespace openIndexedStorage {
  export interface Options { databaseName?: string }
}

export async function openIndexedStorage(
  options: openIndexedStorage.Options = {},
): Promise<ProgressStorage> {
  if (!globalThis.indexedDB) {
    throw new Error('IndexedDB is unavailable. Progress cannot be stored safely.');
  }
  const name = options.databaseName ?? defaultProgressDatabaseName;
  const database = await openDatabase(name);
  try {
    return new IndexedProgressStorage(database, name, await requestRetention());
  } catch (error) {
    database.close();
    throw error;
  }
}

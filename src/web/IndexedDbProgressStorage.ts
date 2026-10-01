import { z } from 'zod';
import { validateQuestionSet } from '../data/question-set';
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

const metadataStore = 'metadata';
const snapshotKey = 'snapshot';
export const defaultProgressDatabaseName = 'quizdeck';
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

async function validateStoredSnapshot(input: unknown): Promise<Snapshot> {
  const snapshot = validateSnapshot(input);
  if (snapshot.currentSet === null) {
    return snapshot;
  }
  return {
    ...snapshot,
    currentSet: await validateQuestionSet(snapshot.currentSet),
  };
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
  return validateStoredSnapshot(value);
}

function writeTransaction(
  database: IDBDatabase,
  expected: Snapshot,
  input: Transaction,
): Promise<Snapshot> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(metadataStore, 'readwrite');
    const metadata = transaction.objectStore(metadataStore);
    let failure: unknown;
    let next: Snapshot | undefined;
    const request = metadata.get(snapshotKey);
    request.addEventListener('success', () => {
      try {
        const current = validateSnapshot(request.result);
        if (current.revision !== expected.revision) {
          throw new StorageConflictError();
        }
        if (JSON.stringify(current.currentSet) !== JSON.stringify(expected.currentSet)) {
          throw new StorageConflictError('Question set changed during preparation. Reload storage.');
        }
        next = applyTransaction(current, input);
        metadata.put(next, snapshotKey);
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

  private readonly listeners = new Set<() => void>();

  private readonly channel: BroadcastChannel;

  private closed = false;

  public constructor(
    private readonly database: IDBDatabase,
    private readonly databaseName: string,
    public readonly retention: ProgressStorage['retention'],
  ) {
    this.location = `IndexedDB ${databaseName} at ${document.location.origin}`;
    this.channel = new BroadcastChannel(`quizdeck-progress:${databaseName}`);
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

  public async load(): Promise<Snapshot> {
    this.assertOpen();
    return readSnapshot(this.database);
  }

  public async commit(input: Transaction): Promise<Snapshot> {
    this.assertOpen();
    const parsed = transactionSchema.parse(input);
    const transaction: Transaction = {
      ...parsed,
      changes: await Promise.all(parsed.changes.map(async (change) => {
        if (change.kind !== 'seedSet') {
          return change;
        }
        return {
          ...change,
          set: await validateQuestionSet(change.set),
        };
      })),
    };
    const current = await this.load();
    this.assertOpen();
    const next = await writeTransaction(this.database, current, transaction);
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

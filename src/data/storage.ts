import { z } from 'zod';
import { bankSchema } from './bank';
import type { Bank } from './bank';
import {
  learningSchema,
  ownerSchema,
  runSchema,
  validateSnapshot,
} from './records';
import type { Snapshot } from './records';

const instant = z.number().int().nonnegative().safe();
const guardSchema = z.strictObject({
  ownerId: z.string().min(1),
  now: instant,
});
export const transactionSchema = z.strictObject({
  expectedRevision: instant,
  changes: z.array(z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('putBank'),
      bank: bankSchema,
    }),
    z.strictObject({
      kind: z.literal('putLearning'),
      answer: learningSchema,
    }),
    z.strictObject({ kind: z.literal('clearLearning') }),
    z.strictObject({
      kind: z.literal('putRun'),
      run: runSchema,
      guard: guardSchema.optional(),
    }),
    z.strictObject({
      kind: z.literal('acquireOwner'),
      owner: ownerSchema,
      now: instant,
    }),
    z.strictObject({
      kind: z.literal('releaseOwner'),
      runId: z.string().min(1),
      ownerId: z.string().min(1),
    }),
  ])).min(1),
});
export type Transaction = z.infer<typeof transactionSchema>;
export type StorageChange = Transaction['changes'][number];

export interface ProgressStorage {
  readonly location: string;
  readonly retention: 'persistent' | 'best-effort';
  load(): Promise<Snapshot>;
  getBank(version: string): Promise<Bank | undefined>;
  commit(transaction: Transaction): Promise<Snapshot>;
  subscribe(listener: () => void): () => void;
  close(): void;
}

export class StorageConflictError extends Error {
  constructor(message = 'Progress changed in another session. Reload before saving.') {
    super(message);
    this.name = 'StorageConflictError';
  }
}

export function applyTransaction(
  current: Snapshot,
  input: Transaction,
  banks: ReadonlyMap<string, Bank>,
): Snapshot {
  const transaction = transactionSchema.parse(input);
  if (current.revision !== transaction.expectedRevision) {
    throw new StorageConflictError();
  }
  const summaries = new Map(current.banks.map((bank) => [bank.version, bank]));
  const learning = new Map(current.learning.map((answer) => [answer.questionId, answer]));
  const runs = new Map(current.runs.map((run) => [run.id, run]));
  const owners = new Map(current.owners.map((owner) => [owner.runId, owner]));
  for (const change of transaction.changes) {
    switch (change.kind) {
      case 'putBank': {
        if (!banks.has(change.bank.version)) {
          throw new Error('Bank snapshot has not been validated');
        }
        summaries.set(change.bank.version, {
          version: change.bank.version,
          questionCount: change.bank.questions.length,
        });
        break;
      }
      case 'putLearning': {
        if (learning.has(change.answer.questionId)) {
          throw new StorageConflictError('This learning question already has a recorded answer.');
        }
        learning.set(change.answer.questionId, change.answer);
        break;
      }
      case 'clearLearning': {
        learning.clear();
        break;
      }
      case 'acquireOwner': {
        const previous = owners.get(change.owner.runId);
        if (change.owner.expiresAt <= change.now) {
          throw new Error('Ownership lease must expire after acquisition');
        }
        if (previous && previous.ownerId !== change.owner.ownerId
          && previous.expiresAt > change.now) {
          throw new StorageConflictError('This practice run is active in another session.');
        }
        owners.set(change.owner.runId, change.owner);
        break;
      }
      case 'releaseOwner': {
        const previous = owners.get(change.runId);
        if (!previous || previous.ownerId !== change.ownerId) {
          throw new StorageConflictError('Practice ownership changed before release.');
        }
        owners.delete(change.runId);
        break;
      }
      case 'putRun': {
        const previous = runs.get(change.run.id);
        if (previous) {
          const owner = owners.get(previous.id);
          if (!change.guard || !owner || owner.ownerId !== change.guard.ownerId
            || owner.expiresAt <= change.guard.now) {
            throw new StorageConflictError('Updating a practice run requires its active ownership.');
          }
          if (previous.status === 'completed'
            || previous.bankVersion !== change.run.bankVersion
            || previous.createdAt !== change.run.createdAt
            || previous.questionIds.some((id, index) => id !== change.run.questionIds[index])
            || change.run.elapsedMs < previous.elapsedMs
            || previous.answers.some((answer, index) => {
              const next = change.run.answers[index];
              return !next || answer.questionId !== next.questionId
                || answer.answerIndex !== next.answerIndex || answer.outcome !== next.outcome;
            })) {
            throw new Error('Saved practice answers, bank, order, and results cannot be rewritten');
          }
        }
        runs.set(change.run.id, change.run);
        break;
      }
      default: {
        throw new Error('Unsupported storage mutation');
      }
    }
  }
  return validateSnapshot({
    schemaVersion: 1,
    revision: current.revision + 1,
    banks: [...summaries.values()],
    learning: [...learning.values()],
    runs: [...runs.values()],
    owners: [...owners.values()],
  }, banks);
}

import { z } from 'zod';
import { bankSchema } from './bank';
import type {
  Bank,
  Question,
} from './bank';

const integer = z.number().int().nonnegative().safe();
const { version } = bankSchema.shape;
const identity = z.string().min(1);
export const answerSchema = z.strictObject({
  questionId: z.number().int().positive().safe(),
  answerIndex: integer,
  outcome: z.enum(['correctly_answered', 'incorrectly_answered']),
});
export const learningSchema = answerSchema.extend({ bankVersion: version });
export const runSchema = z.strictObject({
  id: identity,
  bankVersion: version,
  createdAt: integer,
  completedAt: integer.nullable(),
  status: z.enum(['active', 'paused', 'completed']),
  questionIds: z.array(z.number().int().positive().safe()).length(60).refine((ids) => new Set(ids).size === 60, 'A run must contain 60 distinct question IDs'),
  answers: z.array(answerSchema).max(60),
  nextUnanswered: integer.max(60),
  viewedPosition: integer.max(59),
  elapsedMs: z.number().finite().nonnegative(),
  result: z.strictObject({
    correctCount: integer.max(60),
    percentage: z.number().finite().min(0).max(100),
  }).nullable(),
});
export const ownerSchema = z.strictObject({
  runId: identity,
  ownerId: identity,
  expiresAt: integer,
});
export const snapshotSchema = z.strictObject({
  schemaVersion: z.literal(1),
  revision: integer,
  banks: z.array(z.strictObject({
    version,
    questionCount: integer.positive(),
  })),
  learning: z.array(learningSchema),
  runs: z.array(runSchema),
  owners: z.array(ownerSchema),
});

export type LearningAnswer = z.infer<typeof learningSchema>;
export type PracticeRun = z.infer<typeof runSchema>;
export type RunOwner = z.infer<typeof ownerSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;

const questionIndexes = new WeakMap<Bank, ReadonlyMap<number, Question>>();

export function emptySnapshot(): Snapshot {
  return {
    schemaVersion: 1,
    revision: 0,
    banks: [],
    learning: [],
    runs: [],
    owners: [],
  };
}

function questionIndex(bank: Bank): ReadonlyMap<number, Question> {
  const existing = questionIndexes.get(bank);
  if (existing) {
    return existing;
  }
  const index = new Map<number, Question>();
  for (const question of bank.questions) {
    index.set(question.id, question);
  }
  questionIndexes.set(bank, index);
  return index;
}
function validateAnswer(
  answer: z.infer<typeof answerSchema>,
  bankVersion: string,
  bankIds: ReadonlySet<string>,
  banks: ReadonlyMap<string, Bank>,
) {
  const bank = banks.get(bankVersion);
  const choice = bank
    ? questionIndex(bank).get(answer.questionId)?.answers[answer.answerIndex]
    : undefined;
  if (!bankIds.has(bankVersion) || !choice
    || answer.outcome !== (choice.correct ? 'correctly_answered' : 'incorrectly_answered')) {
    throw new Error('Recorded answer or correctness does not match its question bank');
  }
}
export function validateSnapshot(input: unknown, banks: ReadonlyMap<string, Bank>): Snapshot {
  const snapshot = snapshotSchema.parse(input);
  const bankIds = new Set(snapshot.banks.map((bank) => bank.version));
  if (bankIds.size !== snapshot.banks.length
    || new Set(snapshot.learning.map((answer) => answer.questionId)).size
      !== snapshot.learning.length
    || new Set(snapshot.runs.map((run) => run.id)).size !== snapshot.runs.length
    || new Set(snapshot.owners.map((owner) => owner.runId)).size !== snapshot.owners.length) {
    throw new Error('Persisted records contain duplicate identities');
  }
  for (const summary of snapshot.banks) {
    const bank = banks.get(summary.version);
    if (!bank || bank.questions.length !== summary.questionCount) {
      throw new Error('Persisted bank catalog does not match its immutable snapshot');
    }
  }
  for (const answer of snapshot.learning) {
    validateAnswer(answer, answer.bankVersion, bankIds, banks);
  }
  for (const run of snapshot.runs) {
    const bank = banks.get(run.bankVersion);
    if (!bankIds.has(run.bankVersion) || !bank
      || run.questionIds.some((id) => !questionIndex(bank).has(id))) {
      throw new Error('Practice run references a missing bank or question');
    }
    if (run.answers.length !== run.nextUnanswered
      || run.viewedPosition > Math.min(run.nextUnanswered, 59)) {
      throw new Error('Practice answer frontier and viewed position are inconsistent');
    }
    for (const [position, answer] of run.answers.entries()) {
      if (answer.questionId !== run.questionIds[position]) {
        throw new Error('Practice answers do not follow their saved question order');
      }
      validateAnswer(answer, run.bankVersion, bankIds, banks);
    }
    if (run.status === 'completed') {
      const correctCount = run.answers.filter((answer) => answer.outcome === 'correctly_answered').length;
      if (run.nextUnanswered !== 60 || run.completedAt === null || run.completedAt < run.createdAt
        || !run.result || run.result.correctCount !== correctCount
        || Math.abs(run.result.percentage - (correctCount / 60) * 100) > 0.000001) {
        throw new Error('Completed practice result is inconsistent');
      }
    } else if (run.nextUnanswered === 60 || run.completedAt !== null || run.result !== null) {
      throw new Error('Unfinished practice run contains a completed result');
    }
  }
  for (const owner of snapshot.owners) {
    if (snapshot.runs.every((run) => !(run.id === owner.runId && run.status === 'active'))) {
      throw new Error('Timing ownership must reference an active practice run');
    }
  }
  return snapshot;
}


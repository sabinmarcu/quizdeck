import { z } from 'zod';
import {
  isCorrectSelection,
  questionSetSchema,
} from './question-set';
import type {
  Question,
  QuestionSet,
} from './question-set';

const integer = z.number().int().nonnegative().safe();
const identity = z.string().min(1);
export const answerIndicesSchema = z.array(integer).min(1).refine(
  (indices) => new Set(indices).size === indices.length,
  'Selected answers must be distinct',
).transform((indices) => indices.toSorted((first, second) => first - second));
export const answerSchema = z.strictObject({
  questionId: z.number().int().positive().safe(),
  answerIndices: answerIndicesSchema,
  outcome: z.enum(['correctly_answered', 'incorrectly_answered']),
});
export const learningSchema = answerSchema;
export const runSchema = z.strictObject({
  id: identity,
  createdAt: integer,
  completedAt: integer.nullable(),
  status: z.enum(['active', 'paused', 'completed']),
  questionIds: z.array(z.number().int().positive().safe()).min(1).max(60).refine(
    (ids) => new Set(ids).size === ids.length,
    'A run must contain distinct question IDs',
  ),
  answers: z.array(answerSchema),
  nextUnanswered: integer,
  viewedPosition: integer,
  elapsedMs: z.number().finite().nonnegative(),
  result: z.strictObject({
    correctCount: integer,
    percentage: z.number().finite().min(0).max(100),
  }).nullable(),
}).superRefine((run, context) => {
  const { length } = run.questionIds;
  if (run.answers.length > length || run.nextUnanswered > length
    || run.viewedPosition >= length || (run.result && run.result.correctCount > length)) {
    context.addIssue({
      code: 'custom',
      message: 'Practice run bounds are inconsistent',
    });
  }
  if ((run.status === 'completed') !== (run.nextUnanswered === length)) {
    context.addIssue({
      code: 'custom',
      message: 'Practice completion does not match its answer frontier',
    });
  }
  if (run.result
    && Math.abs(run.result.percentage - (run.result.correctCount / length) * 100) > 0.000001) {
    context.addIssue({
      code: 'custom',
      message: 'Completed practice result is inconsistent',
    });
  }
});
export const ownerSchema = z.strictObject({
  runId: identity,
  ownerId: identity,
  expiresAt: integer,
});
export const snapshotSchema = z.strictObject({
  schemaVersion: z.literal(2),
  revision: integer,
  currentSet: questionSetSchema.nullable(),
  learning: z.array(learningSchema),
  runs: z.array(runSchema),
  owners: z.array(ownerSchema),
});

export type LearningAnswer = z.infer<typeof learningSchema>;
export type PracticeRun = z.infer<typeof runSchema>;
export type RunOwner = z.infer<typeof ownerSchema>;
export type Snapshot = Omit<z.infer<typeof snapshotSchema>, 'currentSet'> & {
  currentSet: QuestionSet | null;
};

const questionIndexes = new WeakMap<QuestionSet, ReadonlyMap<number, Question>>();

export function emptySnapshot(): Snapshot {
  return {
    schemaVersion: 2,
    revision: 0,
    currentSet: null,
    learning: [],
    runs: [],
    owners: [],
  };
}

function questionIndex(set: QuestionSet): ReadonlyMap<number, Question> {
  const existing = questionIndexes.get(set);
  if (existing) {
    return existing;
  }
  const index = new Map<number, Question>();
  for (const question of set.questions) {
    index.set(question.id, question);
  }
  questionIndexes.set(set, index);
  return index;
}

function validateAnswer(answer: z.infer<typeof answerSchema>, set: QuestionSet) {
  const question = questionIndex(set).get(answer.questionId);
  if (!question || answer.answerIndices.some((index) => !question.answers[index])
    || answer.outcome !== (isCorrectSelection(question, answer.answerIndices)
      ? 'correctly_answered'
      : 'incorrectly_answered')) {
    throw new Error('Recorded answer or correctness does not match its question set');
  }
}

export function validateSnapshot(input: unknown): Snapshot {
  const snapshot = snapshotSchema.parse(input);
  const { currentSet } = snapshot;
  if (currentSet && currentSet.questionCount !== currentSet.questions.length) {
    throw new Error('Current question set count does not match its questions');
  }
  if (new Set(snapshot.learning.map((answer) => answer.questionId)).size
      !== snapshot.learning.length
    || new Set(snapshot.runs.map((run) => run.id)).size !== snapshot.runs.length
    || new Set(snapshot.owners.map((owner) => owner.runId)).size !== snapshot.owners.length) {
    throw new Error('Persisted records contain duplicate identities');
  }
  if (!currentSet && (snapshot.learning.length > 0
    || snapshot.runs.length > 0 || snapshot.owners.length > 0)) {
    throw new Error('Persisted progress references a missing current question set');
  }
  if (currentSet) {
    for (const answer of snapshot.learning) {
      validateAnswer(answer, currentSet);
    }
    for (const run of snapshot.runs) {
      const { length } = run.questionIds;
      if (run.questionIds.some((id) => !questionIndex(currentSet).has(id))) {
        throw new Error('Practice run references a missing question');
      }
      if (run.answers.length !== run.nextUnanswered
        || run.nextUnanswered > length
        || run.viewedPosition > Math.min(run.nextUnanswered, length - 1)) {
        throw new Error('Practice answer frontier and viewed position are inconsistent');
      }
      for (const [position, answer] of run.answers.entries()) {
        if (answer.questionId !== run.questionIds[position]) {
          throw new Error('Practice answers do not follow their saved question order');
        }
        validateAnswer(answer, currentSet);
      }
      const complete = run.nextUnanswered === length;
      if ((run.status === 'completed') !== complete) {
        throw new Error('Practice completion does not match its answer frontier');
      }
      if (complete) {
        const correctCount = run.answers.filter((answer) => answer.outcome === 'correctly_answered').length;
        if (run.completedAt === null || run.completedAt < run.createdAt
          || !run.result || run.result.correctCount !== correctCount
          || Math.abs(run.result.percentage - (correctCount / length) * 100) > 0.000001) {
          throw new Error('Completed practice result is inconsistent');
        }
      } else if (run.completedAt !== null || run.result !== null) {
        throw new Error('Unfinished practice run contains a completed result');
      }
    }
  }
  for (const owner of snapshot.owners) {
    if (snapshot.runs.every((run) => !(run.id === owner.runId && run.status === 'active'))) {
      throw new Error('Timing ownership must reference an active practice run');
    }
  }
  return snapshot;
}

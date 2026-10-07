import { z } from 'zod';
import {
  answerSchema,
  runSchema,
  snapshotSchema,
  validateSnapshot,
} from './records';
import type { Snapshot } from './records';

const legacyAnswerSchema = answerSchema.omit({ answerIndices: true }).extend({
  answerIndex: z.number().int().nonnegative().safe(),
});
const legacySnapshotSchema = snapshotSchema.extend({
  schemaVersion: z.literal(1),
  learning: z.array(legacyAnswerSchema),
  runs: z.array(z.strictObject({
    ...runSchema.shape,
    answers: z.array(legacyAnswerSchema),
  })),
});

const convertAnswer = ({ answerIndex, ...answer }: z.infer<typeof legacyAnswerSchema>) => ({
  ...answer,
  answerIndices: [answerIndex],
});
// Used only during the atomic storage upgrade; runtime APIs accept arrays exclusively.
export function migrateSnapshot(input: unknown): Snapshot {
  const legacy = legacySnapshotSchema.parse(input);
  return validateSnapshot({
    ...legacy,
    schemaVersion: 2,
    learning: legacy.learning.map(convertAnswer),
    runs: legacy.runs.map((run) => ({
      ...run,
      answers: run.answers.map(convertAnswer),
    })),
  });
}

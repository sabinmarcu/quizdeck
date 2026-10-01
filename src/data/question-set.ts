import { z } from 'zod';

const textSchema = z.string().refine((value) => value.trim().length > 0, 'Text must not be blank');
const instantSchema = z.number().int().nonnegative().safe();

export const questionSchema = z.strictObject({
  id: z.number().int().positive().safe(),
  description: textSchema,
  answers: z.array(z.strictObject({
    text: textSchema,
    correct: z.boolean(),
    justification: z.string(),
  }).readonly()).min(2).refine(
    (answers) => answers.filter((answer) => answer.correct).length === 1,
    'Each question must have exactly one correct answer',
  ).readonly(),
}).readonly();

export const questionsSchema = z.array(questionSchema).min(1).refine(
  (questions) => new Set(questions.map((question) => question.id)).size === questions.length,
  'Question IDs must be unique',
).readonly();

export const questionSetSchema = z.strictObject({
  name: textSchema,
  source: z.enum(['demo', 'file']),
  loadedAt: instantSchema,
  contentHash: z.string().regex(/^[a-f\d]{64}$/u),
  questionCount: z.number().int().positive().safe(),
  questions: questionsSchema,
});

export type Question = z.infer<typeof questionSchema>;
export type QuestionSet = Readonly<z.infer<typeof questionSetSchema>>;

async function contentHash(questions: readonly Question[]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(questions));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export namespace createQuestionSet {
  export interface Metadata {
    name: string;
    source: 'demo' | 'file';
    loadedAt: number;
  }
}

export async function createQuestionSet(
  input: unknown,
  metadata: createQuestionSet.Metadata,
): Promise<QuestionSet> {
  const questions = questionsSchema.parse(input);
  const parsedMetadata = z.strictObject({
    name: textSchema,
    source: z.enum(['demo', 'file']),
    loadedAt: instantSchema,
  }).parse(metadata);
  return Object.freeze(questionSetSchema.parse({
    ...parsedMetadata,
    contentHash: await contentHash(questions),
    questionCount: questions.length,
    questions,
  }));
}

export async function validateQuestionSet(input: unknown): Promise<QuestionSet> {
  const set = questionSetSchema.parse(input);
  if (set.questionCount !== set.questions.length) {
    throw new Error('Question set count does not match its questions');
  }
  if (set.contentHash !== await contentHash(set.questions)) {
    throw new Error('Question set content does not match its hash');
  }
  return Object.freeze(set);
}

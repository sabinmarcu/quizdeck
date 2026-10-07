import { hash } from '@stablelib/sha256';
import { z } from 'zod';

const textSchema = z.string().refine((value) => value.trim().length > 0, 'Text must not be blank');
const instantSchema = z.number().int().nonnegative().safe();

export const questionSchema = z.strictObject({
  id: z.number().int().positive().safe(),
  description: textSchema,
  justification: z.string().optional(),
  answers: z.array(z.strictObject({
    text: textSchema,
    correct: z.boolean(),
    justification: z.string(),
  }).readonly()).min(2).refine(
    (answers) => answers.some((answer) => answer.correct),
    'Each question must have at least one correct answer',
  ).readonly(),
}).readonly();

export const questionsSchema = z.array(questionSchema).min(1).superRefine((questions, context) => {
  const ids = new Set<number>();
  for (const [index, question] of questions.entries()) {
    if (ids.has(question.id)) {
      context.addIssue({
        code: 'custom',
        path: [index, 'id'],
        message: 'Question IDs must be unique',
      });
    }
    ids.add(question.id);
  }
}).readonly();

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

export function isCorrectSelection(question: Question, answerIndices: readonly number[]): boolean {
  return question.answers.every((answer, index) => (
    answer.correct === answerIndices.includes(index)
  ));
}

export function selectionOutcome(
  question: Question,
  answerIndices: readonly number[],
): 'correctly_answered' | 'incorrectly_answered' | null {
  if (answerIndices.some((index) => !question.answers[index]!.correct)) {
    return 'incorrectly_answered';
  }
  return isCorrectSelection(question, answerIndices) ? 'correctly_answered' : null;
}

export async function questionContentHash(questions: readonly Question[]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(questions));
  return Array.from(hash(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
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
    contentHash: await questionContentHash(questions),
    questionCount: questions.length,
    questions,
  }));
}

export async function validateQuestionSet(input: unknown): Promise<QuestionSet> {
  const set = questionSetSchema.parse(input);
  if (set.questionCount !== set.questions.length) {
    throw new Error('Question set count does not match its questions');
  }
  if (set.contentHash !== await questionContentHash(set.questions)) {
    throw new Error('Question set content does not match its hash');
  }
  return Object.freeze(set);
}

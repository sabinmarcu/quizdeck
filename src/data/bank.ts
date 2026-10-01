import { z } from 'zod';
import questionData from '../questions.json' with { type: 'json' };

const textSchema = z.string().refine((value) => value.trim().length > 0, 'Text must not be blank');

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

export const bankSchema = z.strictObject({
  version: z.string().regex(/^[a-f\d]{64}$/u),
  questions: questionsSchema,
});

export type Question = z.infer<typeof questionSchema>;
export type Bank = Readonly<z.infer<typeof bankSchema>>;

async function contentVersion(questions: readonly Question[]) {
  const bytes = new TextEncoder().encode(JSON.stringify(questions));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function validateBank(input: unknown): Promise<Bank> {
  const bank = bankSchema.parse(input);
  const version = await contentVersion(bank.questions);
  if (bank.version !== version) {
    throw new Error('Question bank content does not match its version');
  }
  return Object.freeze(bank);
}

let bundledBank: Promise<Bank> | undefined;

export function loadBundledBank(): Promise<Bank> {
  bundledBank ??= (async () => {
    const questions = questionsSchema.parse(questionData);
    const version = await contentVersion(questions);
    return Object.freeze({
      version,
      questions,
    });
  })();
  return bundledBank;
}


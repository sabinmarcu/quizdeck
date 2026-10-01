import { createHash } from 'node:crypto';
import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  questionsSchema,
  validateBank,
} from './bank';

const question = {
  id: 1,
  description: 'Which answer is correct?',
  answers: [
    {
      text: 'First',
      correct: false,
      justification: '',
    },
    {
      text: 'Second',
      correct: true,
      justification: 'The second answer is correct.',
    },
    {
      text: 'Third',
      correct: false,
      justification: '',
    },
  ],
};

describe('question bank trust boundary', () => {
  it('rejects duplicate source IDs rather than merging questions', () => {
    expect(() => questionsSchema.parse([question, {
      ...question,
      description: 'Different text',
    }])).toThrow('unique');
  });

  it('rejects a bank without exactly one correct choice per question', () => {
    expect(() => questionsSchema.parse([{
      ...question,
      answers: question.answers.map((answer) => ({
        ...answer,
        correct: false,
      })),
    }])).toThrow('exactly one');
    expect(() => questionsSchema.parse([{
      ...question,
      answers: question.answers.map((answer) => ({
        ...answer,
        correct: true,
      })),
    }])).toThrow('exactly one');
  });

  it('rejects blank question and answer content', () => {
    expect(() => questionsSchema.parse([{
      ...question,
      description: '  ',
    }])).toThrow('blank');
    expect(() => questionsSchema.parse([{
      ...question,
      answers: [{
        text: '\n',
        correct: true,
        justification: '',
      }, question.answers[0]],
    }])).toThrow();
  });

  it('accepts a three-choice source with missing explanations and verifies its content identity', async () => {
    const questions = [question];
    const version = createHash('sha256').update(JSON.stringify(questions)).digest('hex');
    const bank = await validateBank({
      version,
      questions,
    });
    expect(bank.version).toBe(version);
    await expect(validateBank({
      version,
      questions: [{
        ...question,
        description: 'Altered content',
      }],
    })).rejects.toThrow('does not match');
  });
});

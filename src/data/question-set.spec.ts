import { createHash } from 'node:crypto';
import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  createQuestionSet,
  questionsSchema,
  validateQuestionSet,
} from './question-set';

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

describe('question set trust boundary', () => {
  it('locates duplicate source IDs on the later question rather than merging them', () => {
    const result = questionsSchema.safeParse([question, {
      ...question,
      description: 'Different text',
    }]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: [1, 'id'],
        message: 'Question IDs must be unique',
      }));
    }
  });

  it('rejects a source without exactly one correct choice', () => {
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

  it('hashes source JSON without changing wording or question order', async () => {
    const questions = [question];
    const set = await createQuestionSet(questions, {
      name: 'Imported Set',
      source: 'file',
      loadedAt: 42,
    });
    const expectedHash = createHash('sha256').update(JSON.stringify(questions)).digest('hex');
    expect(set).toMatchObject({
      name: 'Imported Set',
      source: 'file',
      loadedAt: 42,
      contentHash: expectedHash,
      questionCount: 1,
      questions,
    });
    await expect(validateQuestionSet(set)).resolves.toEqual(set);
  });

  it('rejects a stored set with altered content or count', async () => {
    const set = await createQuestionSet([question], {
      name: 'Imported Set',
      source: 'file',
      loadedAt: 0,
    });
    await expect(validateQuestionSet({
      ...set,
      questions: [{
        ...question,
        description: 'Altered content',
      }],
    })).rejects.toThrow('hash');
    await expect(validateQuestionSet({
      ...set,
      questionCount: 2,
    })).rejects.toThrow('count');
  });
});

import { createHash } from 'node:crypto';
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
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

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it('requires a correct choice and preserves multiple correct choices', () => {
    expect(() => questionsSchema.parse([{
      ...question,
      answers: question.answers.map((answer) => ({
        ...answer,
        correct: false,
      })),
    }])).toThrow('at least one');
    const multiple = {
      ...question,
      answers: question.answers.map((answer) => ({
        ...answer,
        correct: true,
      })),
    };
    expect(questionsSchema.parse([multiple])[0]?.answers.map((answer) => answer.correct))
      .toEqual([true, true, true]);
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

  it('preserves SHA-256 hashes and stored set validation without crypto.subtle', async () => {
    vi.stubGlobal('crypto', {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });
    const questions = [{
      ...question,
      description: 'Unicode: café, 日本語, 🧠. '.repeat(20),
    }];
    const set = await createQuestionSet(questions, {
      name: 'LAN Set',
      source: 'file',
      loadedAt: 42,
    });
    expect(set.contentHash).toBe(createHash('sha256').update(JSON.stringify(questions)).digest('hex'));
    await expect(validateQuestionSet(set)).resolves.toEqual(set);
    await expect(validateQuestionSet({
      ...set,
      questions: [{
        ...questions[0],
        description: 'Altered content',
      }],
    })).rejects.toThrow('hash');
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

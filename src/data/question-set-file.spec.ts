import { createHash } from 'node:crypto';
import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  parseQuestionSet,
  QuestionSetParseError,
  setDisplayName,
} from './question-set-file';

const question = {
  id: 2,
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
  ],
};

async function parseFailure(text: string): Promise<QuestionSetParseError> {
  try {
    await parseQuestionSet(text, 'questions.json');
  } catch (error) {
    if (error instanceof QuestionSetParseError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected question set parsing to fail');
}

describe('setDisplayName', () => {
  it.each([
    ['demoSet', 'Demo Set'],
    ['networkBasics.json', 'Network Basics'],
    ['historyProcessed.json', 'History Processed'],
    ['questions.json', 'Questions'],
    ['sql-joins_review.json', 'Sql Joins Review'],
    ['awsIAMRoles.json', 'Aws IAM Roles'],
    ['sets\\networkBasics.JSON', 'Network Basics'],
    ['chapter2Review.json', 'Chapter2 Review'],
    ['APIRequest.json', 'API Request'],
    ['folder/under_score-and.dots.json', 'Under Score And Dots'],
    ['.json', 'Untitled Set'],
    [' '.repeat(3), 'Untitled Set'],
  ])('derives %s as %s', (fileName, expected) => {
    expect(setDisplayName(fileName)).toBe(expected);
  });
});

describe('parseQuestionSet', () => {
  it('sorts validated questions by ID while preserving their wording and answer order', async () => {
    const questions = [question, {
      ...question,
      id: 1,
      description: 'Earlier question',
    }];
    const result = await parseQuestionSet(JSON.stringify(questions), 'networkBasics.json');
    const expectedQuestions = [questions[1], questions[0]];

    expect(result).toEqual({
      name: 'Network Basics',
      questions: expectedQuestions,
      contentHash: createHash('sha256').update(JSON.stringify(expectedQuestions)).digest('hex'),
      questionCount: 2,
    });
  });

  it.each([
    ['duplicate IDs', JSON.stringify([question, {
      ...question,
      description: 'Another question',
    }]), '[1].id'],
    ['no correct answer', JSON.stringify([{
      ...question,
      answers: question.answers.map((answer) => ({
        ...answer,
        correct: false,
      })),
    }]), '[0].answers'],
    ['blank text', JSON.stringify([{
      ...question,
      description: '  ',
    }]), '[0].description'],
    ['unknown properties', JSON.stringify([{
      ...question,
      unexpected: true,
    }]), '[0]'],
    ['a non-array root', JSON.stringify({ question }), '$'],
  ])('reports the location for %s', async (_caseName, text, location) => {
    const error = await parseFailure(text);

    expect(error.issues.map((issue) => issue.location)).toContain(location);
  });

  it('reports malformed JSON as a parse failure', async () => {
    const error = await parseFailure('[{');

    expect(error.issues).toHaveLength(1);
    expect(error.issues[0]!.location).toBe('JSON');
  });

  it('limits its displayed failures and identifies omitted issues', async () => {
    const duplicates = Array.from({ length: 22 }, (_, index) => ({
      ...question,
      description: `Question ${index + 1}`,
    }));
    const error = await parseFailure(JSON.stringify(duplicates));

    expect(error.issues).toHaveLength(21);
    expect(error.message.split('\n')).toHaveLength(21);
    expect(error.message).toContain('+1 more');
  });
});

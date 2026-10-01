import {
  createQuestionSet,
  type Question,
  type QuestionSet,
} from './question-set';

export async function createFixtureSet(count = 70): Promise<QuestionSet> {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error('Fixture question count must be a positive integer.');
  }
  const questions: Question[] = Array.from({ length: count }, (_, index): Question => ({
    id: index + 1,
    description: `Question ${index + 1}`,
    answers: [
      {
        text: 'Correct answer',
        correct: true,
        justification: 'Correct explanation',
      },
      {
        text: 'Incorrect answer',
        correct: false,
        justification: '',
      },
    ],
  }));
  return createQuestionSet(questions, {
    name: 'Fixture Set',
    source: 'file',
    loadedAt: 0,
  });
}

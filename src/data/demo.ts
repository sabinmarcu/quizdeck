import { setDisplayName } from './question-set-file';
import {
  createQuestionSet,
  type Question,
  type QuestionSet,
} from './question-set';

export const demoQuestions: readonly Question[] = [
  {
    id: 1,
    description: 'What is the first step in a Quizdeck study session?',
    answers: [
      {
        text: 'Read a question and choose an answer',
        correct: true,
        justification: 'Quizdeck presents one question at a time for study.',
      },
      {
        text: 'Upload a new question set',
        correct: false,
        justification: '',
      },
      {
        text: 'Create a score report',
        correct: false,
        justification: '',
      },
    ],
  },
  {
    id: 2,
    description: 'What does Quizdeck save after you answer a learning question?',
    answers: [
      {
        text: 'Your selected answer and whether it was correct',
        correct: true,
        justification: 'Saved progress lets Quizdeck track the questions you have studied.',
      },
      {
        text: 'A replacement question set',
        correct: false,
        justification: '',
      },
    ],
  },
  {
    id: 3,
    description: 'How many questions are included in this demo set?',
    answers: [
      {
        text: 'Three',
        correct: true,
        justification: 'This bundled demo is intentionally short.',
      },
      {
        text: 'Sixty',
        correct: false,
        justification: '',
      },
    ],
  },
];

export function createDemoSet(loadedAt: number): Promise<QuestionSet> {
  return createQuestionSet(demoQuestions, {
    name: setDisplayName('demoSet'),
    source: 'demo',
    loadedAt,
  });
}

import type { Key } from 'ink';
import wrapAnsi from 'wrap-ansi';
import { learningAnswerIndex } from '../state/learning';

export function questionControls(multiple: boolean) {
  return [
    'h/l or left/right previous/next · Esc back · j/k focus or read · ',
    multiple
      ? 'Enter/Space/a-d/1-4 select choice'
      : 'Enter/a-d/1-4 answer',
  ].join('');
}

export interface QuestionLine {
  text: string;
  color?: 'green' | 'red' | 'yellow';
  choiceIndex?: number;
  choiceStart?: boolean;
}
export interface QuestionContent {
  title: string;
  statusColor?: QuestionLine['color'];
  description: string;
  notice?: string;
  canAnswer: boolean;
  afterword?: string;
  choices: ReadonlyArray<{
    text: string;
    selected?: boolean;
    feedback?: null | { selected: boolean; correct: boolean; justification: string };
  }>;
}

function feedbackLabel(selected: boolean, correct: boolean) {
  if (selected) {
    return correct ? 'selected · correct' : 'selected · incorrect';
  }
  return correct ? 'correct' : 'incorrect · not selected';
}

export function questionContentLines(content: QuestionContent, width: number): QuestionLine[] {
  const source: QuestionLine[] = [
    {
      text: content.title,
      color: content.statusColor,
    },
    ...(content.notice ? [{ text: content.notice }] : []),
    { text: ' ' },
    { text: content.description },
    { text: ' ' },
    { text: ' ' },
    ...content.choices.flatMap((choice, index): QuestionLine[] => {
      const label = String.fromCodePoint(65 + index);
      if (choice.feedback) {
        const color = choice.feedback.correct ? 'green' : 'red';
        return [
          {
            text: `${label}. ${choice.text} [${feedbackLabel(choice.feedback.selected, choice.feedback.correct)}]`,
            color,
          },
          {
            text: `   Explanation: ${choice.feedback.justification}`,
            color,
          },
          { text: '' },
        ];
      }
      return [
        {
          text: `  ${label}. ${choice.text}${choice.selected ? ' [selected]' : ''}`,
          choiceIndex: content.canAnswer ? index : undefined,
        },
        { text: '' },
      ];
    }),
    ...(content.afterword
      ? [{ text: ' ' }, {
        text: content.afterword,
        color: content.statusColor,
      }]
      : []),
  ];
  return source.flatMap((line) => wrapAnsi(line.text, Math.max(1, width), {
    hard: true,
    trim: false,
  }).split('\n').map((text, index) => ({
    text,
    color: line.color,
    choiceIndex: line.choiceIndex,
    choiceStart: line.choiceIndex !== undefined && index === 0,
  })));
}
export type QuestionAction =
  | { type: 'boundary'; end: boolean }
  | { type: 'question'; step: number }
  | { type: 'back' }
  | { type: 'choice'; step: number }
  | { type: 'answer'; index: number | null };

export function questionAction(input: string, key: Key, multiple = false): QuestionAction | null {
  if (key.eventType === 'release' || key.meta || key.ctrl || key.super || key.hyper) {
    return null;
  }
  if (input === 'gg' || key.home) {
    return {
      type: 'boundary',
      end: false,
    };
  }
  if (input === 'G' || key.end) {
    return {
      type: 'boundary',
      end: true,
    };
  }
  if (input === 'h' || key.leftArrow) {
    return {
      type: 'question',
      step: -1,
    };
  }
  if (input === 'l' || key.rightArrow) {
    return {
      type: 'question',
      step: 1,
    };
  }
  if (key.escape) {
    return { type: 'back' };
  }
  if (input === 'j' || key.downArrow) {
    return {
      type: 'choice',
      step: 1,
    };
  }
  if (input === 'k' || key.upArrow) {
    return {
      type: 'choice',
      step: -1,
    };
  }
  if (key.eventType === 'repeat') {
    return null;
  }
  const index = learningAnswerIndex(input);
  if (index !== null || key.return || (multiple && input === ' ')) {
    return {
      type: 'answer',
      index,
    };
  }
  return null;
}

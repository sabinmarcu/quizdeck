import { Text } from 'ink';
import type { QuestionLine } from './question-presentation';

export namespace InkQuestion {
  export interface Props {
    lines: readonly QuestionLine[];
    offset: number;
    rowCount: number;
    focusedChoice: number | null;
  }
}

export function InkQuestion({
  lines, offset, rowCount, focusedChoice,
}: InkQuestion.Props) {
  return lines.slice(offset, offset + rowCount).map((line, index) => {
    const focused = focusedChoice !== null && line.choiceIndex === focusedChoice;
    const text = focused && line.choiceStart ? `› ${line.text.slice(2)}` : line.text;
    return (
      <Text
        bold={focused}
        color={focused ? 'cyan' : line.color}
        key={`${offset + index}-${line.text}`}
      >
        {text}
      </Text>
    );
  });
}

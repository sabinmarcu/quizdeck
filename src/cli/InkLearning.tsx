import {
  useAtom,
  useAtomValue,
  useSetAtom,
} from 'jotai';
import {
  Box,
  Text,
  useInput,
  useStdout,
} from 'ink';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import wrapAnsi from 'wrap-ansi';
import {
  actionErrorAtom,
  pendingAtom,
  startupAtom,
} from '../state/application';
import {
  answerLearningAtom,
  learningAdjacentAtom,
  learningCountsAtom,
  learningDetailAtom,
  learningRowsAtom,
  learningStatusLabels,
  openLearningQuestionAtom,
  resetLearningAtom,
} from '../state/learning';
import type {
  LearningRow,
  LearningStatus,
} from '../state/learning';
import {
  learningFilterAtom,
  learningFilters,
  learningFocusedIdAtom,
  learningQuestionIdAtom,
  learningQueryAtom,
  learningResetOpenAtom,
} from '../state/learning-state';
import type { LearningFilter } from '../state/learning-state';
import { InkQuestion } from './InkQuestion';
import {
  questionAction,
  questionContentLines,
  questionControls,
} from './question-presentation';
import type { QuestionLine } from './question-presentation';

const statusColors: Record<LearningStatus, QuestionLine['color']> = {
  unanswered: undefined,
  correctly_answered: 'green',
  incorrectly_answered: 'red',
};

interface ListItem {
  lines: QuestionLine[];
  start: number;
  end: number;
}

function wrapLines(text: string, width: number): string[] {
  return wrapAnsi(text, Math.max(1, width), {
    hard: true,
    trim: false,
  }).split('\n');
}

function listViewportItems(rows: LearningRow[], width: number): ListItem[] {
  const items: ListItem[] = [];
  let line = 0;
  for (const row of rows) {
    const preview = row.description.length > 140
      ? `${row.description.slice(0, 140)}…`
      : row.description;
    const lines = wrapLines(`${row.id} · ${learningStatusLabels[row.status]}\n${preview}`, width)
      .map((text) => ({
        text,
        color: statusColors[row.status],
      }));
    items.push({
      lines,
      start: line,
      end: line + lines.length,
    });
    line += lines.length + 1;
  }
  return items;
}

function nextFilter(current: LearningFilter): LearningFilter {
  const index = learningFilters.indexOf(current);
  return learningFilters[(index + 1) % learningFilters.length]!;
}

export namespace InkLearning {
  export interface Props { onExit(): void; onQuit(): void }
}

export function InkLearning({ onExit, onQuit }: InkLearning.Props) {
  const startup = useAtomValue(startupAtom);
  const pending = useAtomValue(pendingAtom);
  const actionError = useAtomValue(actionErrorAtom);
  const rows = useAtomValue(learningRowsAtom);
  const counts = useAtomValue(learningCountsAtom);
  const detail = useAtomValue(learningDetailAtom);
  const adjacent = useAtomValue(learningAdjacentAtom);
  const [query, setQuery] = useAtom(learningQueryAtom);
  const [filter, setFilter] = useAtom(learningFilterAtom);
  const [focusedId, setFocusedId] = useAtom(learningFocusedIdAtom);
  const [, setQuestionId] = useAtom(learningQuestionIdAtom);
  const [resetOpen, setResetOpen] = useAtom(learningResetOpenAtom);
  const setActionError = useSetAtom(actionErrorAtom);
  const openQuestion = useSetAtom(openLearningQuestionAtom);
  const answerQuestion = useSetAtom(answerLearningAtom);
  const resetLearning = useSetAtom(resetLearningAtom);
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    rows: stdout.rows || 24,
    columns: stdout.columns || 80,
  });
  const [detailOffset, setDetailOffset] = useState(0);
  const [choiceFocus, setChoiceFocus] = useState(0);
  const [searching, setSearching] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const firstGAt = useRef<number | null>(null);
  const viewportRows = Math.max(1, size.rows - 10);
  const width = Math.max(1, size.columns - 2);
  const focusedIndex = Math.max(0, rows.findIndex((row) => row.id === focusedId));
  const selectedRow = rows[focusedIndex] ?? null;
  const listItems = useMemo(() => listViewportItems(rows, width), [rows, width]);
  const listLines = useMemo<QuestionLine[]>(() => listItems.flatMap((item) => [...item.lines, { text: '' }]), [listItems]);
  const activeListItem = listItems[focusedIndex] ?? null;
  const detailLines = useMemo(() => {
    if (!detail) {
      return [];
    }
    return questionContentLines({
      title: `Question ${detail.id} · ${learningStatusLabels[detail.status]}`,
      statusColor: statusColors[detail.status],
      description: detail.description,
      choices: detail.choices,
      canAnswer: detail.status === 'unanswered',
      afterword: detail.status !== 'unanswered'
        ? 'This answer is saved. Reset all learning progress to answer this question again.'
        : undefined,
    }, width);
  }, [detail, width]);
  const detailLimit = Math.max(0, detailLines.length - viewportRows);
  const visibleDetailOffset = Math.min(detailOffset, detailLimit);
  const visibleListOffset = activeListItem?.start ?? 0;
  const answerFocus = detail ? Math.min(choiceFocus, detail.choices.length - 1) : 0;
  const answered = detail !== null && detail.choices[0]?.feedback !== null;

  useEffect(() => {
    const resize = () => {
      setSize({
        rows: stdout.rows || 24,
        columns: stdout.columns || 80,
      });
    };
    stdout.on('resize', resize);
    return () => { stdout.off('resize', resize); };
  }, [stdout]);

  const openSelectedQuestion = () => {
    if (!selectedRow) {
      return;
    }

    openQuestion(selectedRow.id);
    setDetailOffset(0);
    setChoiceFocus(0);
  };

  const moveListFocus = (amount: number) => {
    const next = rows[Math.max(0, Math.min(rows.length - 1, focusedIndex + amount))];
    if (next) {
      setFocusedId(next.id);
    }
  };

  const moveDetail = (amount: number) => {
    if (!detail) {
      return;
    }
    const next = amount < 0 ? adjacent.previous : adjacent.next;
    if (next !== null) {
      openQuestion(next);
      setDetailOffset(0);
      setChoiceFocus(0);
    }
  };

  const openResetConfirmation = () => {
    setActionError(null);
    setConfirmReset(false);
    setResetOpen(true);
  };

  const cancelReset = () => {
    setActionError(null);
    setConfirmReset(false);
    setResetOpen(false);
  };

  const answer = (answerIndex: number) => {
    if (!detail || answered || pending || answerIndex >= detail.choices.length) {
      return;
    }
    answerQuestion({
      questionId: detail.id,
      answerIndex,
    });
  };

  useInput((input, key) => {
    if (key.eventType === 'release' || key.super || key.hyper) {
      return;
    }
    if (resetOpen) {
      if (pending) {
        return;
      }
      if (key.escape || input === 'q' || input === 'n' || input === 'h') {
        cancelReset();
        return;
      }
      if (input === 'j' || key.downArrow || input === 'k' || key.upArrow) {
        setConfirmReset((current) => !current);
        return;
      }
      if (key.return) {
        if (confirmReset) {
          resetLearning();
        } else {
          cancelReset();
        }
      }
      return;
    }

    if (searching) {
      if (key.escape) {
        setSearching(false);
        return;
      }
      if (key.backspace) {
        setQuery((current) => current.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta && !key.return) {
        setQuery((current) => current + input);
      }
      return;
    }

    if (input === 'q' && !key.ctrl && !key.meta) {
      onQuit();
      return;
    }
    if (showHelp) {
      if (key.escape || input === '?') {
        setShowHelp(false);
      }
      return;
    }
    if (input === '?' && !key.ctrl && !key.meta) {
      setShowHelp(true);
      return;
    }
    if (input === '/' && !key.ctrl && !key.meta) {
      setSearching(true);
      return;
    }
    if (input === 'r' && !key.ctrl && !key.meta) {
      openResetConfirmation();
      return;
    }
    if (!detail && input === 'f' && !key.ctrl && !key.meta) {
      setFilter((current) => nextFilter(current));
      return;
    }
    if (!detail && input === 'c' && !key.ctrl && !key.meta) {
      setQuery('');
      return;
    }
    if (key.ctrl && input === 'd') {
      if (detail) {
        setDetailOffset((offset) => Math.min(
          detailLimit,
          offset + Math.max(1, Math.floor(viewportRows / 2)),
        ));
      } else {
        moveListFocus(Math.max(1, Math.floor(viewportRows / 6)));
      }
      return;
    }
    if (key.ctrl && input === 'u') {
      if (detail) {
        setDetailOffset((offset) => Math.max(
          0,
          offset - Math.max(1, Math.floor(viewportRows / 2)),
        ));
      } else {
        moveListFocus(-Math.max(1, Math.floor(viewportRows / 6)));
      }
      return;
    }
    if (key.ctrl || key.meta) {
      return;
    }
    let navigation = input;
    if (input === 'g' && !key.ctrl && !key.meta) {
      const now = performance.now();
      navigation = firstGAt.current !== null && now - firstGAt.current < 800 ? 'gg' : '';
      firstGAt.current = navigation ? null : now;
    } else {
      firstGAt.current = null;
    }
    if (detail) {
      const interaction = questionAction(navigation, key);
      if (!interaction) {
        return;
      }
      switch (interaction.type) {
        case 'boundary': {
          setDetailOffset(interaction.end ? detailLimit : 0);
          break;
        }
        case 'question': {
          moveDetail(interaction.step);
          break;
        }
        case 'back': {
          setQuestionId(null);
          break;
        }
        case 'choice': {
          if (answered) {
            setDetailOffset(Math.max(0, Math.min(
              detailLimit,
              visibleDetailOffset + interaction.step,
            )));
          } else {
            const next = Math.max(0, Math.min(
              detail.choices.length - 1,
              choiceFocus + interaction.step,
            ));
            setChoiceFocus(next);
            const line = detailLines.findIndex((item) => item.choiceIndex === next);
            setDetailOffset(Math.max(0, Math.min(detailLimit, line)));
          }
          break;
        }
        case 'answer': {
          answer(interaction.index ?? answerFocus);
          break;
        }
        default: {
          break;
        }
      }
      return;
    }
    if (navigation === 'gg' || key.home) {
      const first = rows[0];
      if (first) {
        setFocusedId(first.id);
      }
      return;
    }
    if (navigation === 'G' || key.end) {
      const last = rows.at(-1);
      if (last) {
        setFocusedId(last.id);
      }
      return;
    }
    if (navigation === 'j' || key.downArrow) {
      moveListFocus(1);
      return;
    }
    if (navigation === 'k' || key.upArrow) {
      moveListFocus(-1);
      return;
    }
    if (navigation === 'l' || key.rightArrow || key.return) {
      openSelectedQuestion();
      return;
    }
    if (navigation === 'h' || key.leftArrow || key.escape) {
      onExit();
    }
  });

  if (startup.status === 'loading') {
    return <Text>Opening persisted progress storage…</Text>;
  }
  if (startup.status === 'error') {
    return <Text color="red">{`Storage error: ${startup.message}`}</Text>;
  }

  const renderedList = listLines
    .slice(visibleListOffset, visibleListOffset + viewportRows)
    .map((line, index) => {
      const absolute = visibleListOffset + index;
      const focused = activeListItem !== null
        && absolute >= activeListItem.start && absolute < activeListItem.end;
      return (
        <Text color={line.color} inverse={focused} key={`${absolute}-${line.text}`}>
          {line.text}
        </Text>
      );
    });
  const detailControls = `${questionControls} · r Reset all`;
  const listControls = [
    '/ search · f filter · c clear · l/right/Enter open · ',
    'h/left leave · r Reset all · ? help · q quit',
  ].join('');

  return (
    <Box flexDirection="column">
      <Text bold>Learn</Text>
      <Text>
        {`Completed ${counts.completed}/${counts.total} · ${rows.length} `}
        {rows.length === 1 ? 'result' : 'results'}
        {` · Filter: ${learningStatusLabels[filter]}`}
      </Text>
      <Text>
        {`Search: ${query || '(all questions)'}${searching ? '  editing…' : ''}`}
      </Text>
      {resetOpen && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow" bold>Reset all learning progress?</Text>
          <Text>
            {'This permanently removes every saved learning answer. '}
            Practice records are unchanged.
          </Text>
          <Text inverse={!confirmReset}>Cancel</Text>
          <Text inverse={confirmReset}>Confirm reset all learning progress</Text>
          <Text dimColor>
            j/k or arrows select · Enter activate · Esc, h, n, or q cancel
          </Text>
        </Box>
      )}
      {!resetOpen && showHelp && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Learning controls</Text>
          <Text>
            {'/ search text or ID · Esc stops editing without clearing · '}
            c clears the query
          </Text>
          <Text>
            {'f changes filter · j/k or arrows move focus · '}
            gg/G or Home/End go to boundaries
          </Text>
          <Text>
            {'Ctrl-d/u scrolls half a page · l/right/Enter opens a row · '}
            h/left leaves the list
          </Text>
          <Text>
            In detail, h/l or left/right move through filtered results; Esc returns to the list.
          </Text>
          <Text>
            {'j/k selects a choice only; Enter, a-d, or 1-4 saves '}
            the selected answer once.
          </Text>
          <Text>
            {'r opens Reset all learning progress confirmation · '}
            q quits outside search/confirmation
          </Text>
          <Text dimColor>? or Esc closes this help</Text>
        </Box>
      )}
      {!resetOpen && !showHelp && !detail && (
        <Box flexDirection="column" marginTop={1}>
          {rows.length === 0
            ? <Text>No questions match this search and filter.</Text>
            : renderedList}
        </Box>
      )}
      {!resetOpen && !showHelp && detail && (
        <Box flexDirection="column" marginTop={1}>
          <InkQuestion
            lines={detailLines}
            offset={visibleDetailOffset}
            rowCount={viewportRows}
            focusedChoice={answered ? null : answerFocus}
          />
        </Box>
      )}
      {pending && <Text>Saving progress…</Text>}
      {actionError && <Text color="red">{`Save error: ${actionError}`}</Text>}
      {!resetOpen && !showHelp && (
        <Box marginTop={detail ? 1 : 0}>
          <Text dimColor>{detail ? detailControls : listControls}</Text>
        </Box>
      )}
    </Box>
  );
}

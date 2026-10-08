import {
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
import { formatPracticeDuration } from '../data/practice';
import type { PracticeReportQuestion } from '../data/practice';
import {
  pendingAtom,
  startupAtom,
} from '../state/application';
import {
  answerPracticeAtom,
  leavePracticeAtom,
  openPracticeAtom,
  pausePracticeAtom,
  practiceBusyAtom,
  practiceErrorAtom,
  practiceHistoryAtom,
  practiceReportAtom,
  practiceViewAtom,
  refreshPracticeAtom,
  resumePracticeAtom,
  startPracticeAtom,
  viewPracticeAtom,
} from '../state/practice';
import { createPracticeAnswerGate } from './practice-input';
import { InkQuestion } from './InkQuestion';
import {
  questionAction,
  questionContentLines,
  questionControls,
} from './question-presentation';
import type { QuestionLine } from './question-presentation';

interface TerminalLine extends QuestionLine {
  historyIndex?: number;
}

type PracticeScreen = 'history' | 'run' | 'report';

function wrapLines(line: TerminalLine, width: number): TerminalLine[] {
  return wrapAnsi(line.text, width, {
    hard: true,
    trim: false,
  })
    .split('\n')
    .map((text, index) => ({
      ...line,
      text,
      choiceStart: line.choiceIndex !== undefined && index === 0,
    }));
}

function reportLines(question: PracticeReportQuestion, width: number): TerminalLine[] {
  const correct = question.outcome === 'correctly_answered';
  return [
    ...questionContentLines({
      title: `Practice question ${question.position} → Dataset question ${question.questionId}`
        + ` · ${correct ? 'Correctly answered' : 'Incorrectly answered'}`,
      statusColor: correct ? 'green' : 'red',
      description: question.description,
      justification: question.justification,
      choices: question.choices.map((choice) => ({
        text: choice.text,
        feedback: choice,
      })),
      canAnswer: false,
    }, width),
    { text: ' ' },
  ];
}

function historyLabel(status: 'active' | 'paused' | 'completed') {
  switch (status) {
    case 'active': { return 'Active';
    }
    case 'paused': { return 'Paused';
    }
    case 'completed': { return 'Completed';
    }
    default: { return status;
    }
  }
}

export namespace InkPractice {
  export interface Props { onExit(): void; onQuit(): void }
}

export function InkPractice({ onExit, onQuit }: InkPractice.Props) {
  const startup = useAtomValue(startupAtom);
  const history = useAtomValue(practiceHistoryAtom);
  const view = useAtomValue(practiceViewAtom);
  const report = useAtomValue(practiceReportAtom);
  const busy = useAtomValue(practiceBusyAtom);
  const pending = useAtomValue(pendingAtom);
  const practiceError = useAtomValue(practiceErrorAtom);
  const start = useSetAtom(startPracticeAtom);
  const open = useSetAtom(openPracticeAtom);
  const answer = useSetAtom(answerPracticeAtom);
  const changeView = useSetAtom(viewPracticeAtom);
  const pause = useSetAtom(pausePracticeAtom);
  const resume = useSetAtom(resumePracticeAtom);
  const leave = useSetAtom(leavePracticeAtom);
  const refresh = useSetAtom(refreshPracticeAtom);
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    rows: stdout.rows || 24,
    columns: stdout.columns || 80,
  });
  const [historyOpen, setHistoryOpen] = useState(true);
  const [historyFocus, setHistoryFocus] = useState(0);
  const [choiceFocus, setChoiceFocus] = useState(0);
  const [offset, setOffset] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const dispatching = useRef(false);
  const firstGAt = useRef<number | null>(null);
  const [answerGate] = useState(createPracticeAnswerGate);
  const width = Math.max(1, size.columns - 2);
  const viewportRows = Math.max(1, size.rows - 10);
  let screen: PracticeScreen = 'run';
  if (historyOpen) {
    screen = 'history';
  } else if (report) {
    screen = 'report';
  }
  const focusedChoice = view ? Math.min(choiceFocus, view.choices.length - 1) : 0;
  const practiceLength = startup.status === 'ready'
    ? Math.min(60, startup.set.questionCount)
    : 0;

  const runLines = useMemo<TerminalLine[]>(() => {
    if (!view) {
      return [];
    }
    return questionContentLines({
      title: `Practice question ${view.position + 1}/${view.total}`,
      description: view.description,
      choices: view.choices,
      canAnswer: view.canAnswer,
    }, width);
  }, [view, width]);
  const completedLines = useMemo<TerminalLine[]>(() => {
    if (!report) {
      return [{ text: 'Opening completed practice report…' }];
    }
    const lines = report.questions.flatMap((question) => reportLines(question, width));
    while (lines.length > 0) {
      const last = lines.at(-1)!;
      if (last.text !== '' && last.text !== ' ') {
        break;
      }
      lines.pop();
    }
    return lines;
  }, [report, width]);
  const historyLines = useMemo<TerminalLine[]>(() => history.flatMap((entry, index) => {
    const score = entry.score
      ? ` · Score ${entry.score.correctCount}/${entry.total} (${entry.score.percentage.toFixed(1)}%)`
      : '';
    return [
      {
        text: `Practice run ${index + 1} · ${historyLabel(entry.status)}`
          + ` · ${entry.answeredCount}/${entry.total} answered`
          + ` · ${formatPracticeDuration(entry.elapsedMs)}${score}`,
        historyIndex: index,
      },
      {
        text: new Date(entry.createdAt).toLocaleString(),
        historyIndex: index,
      },
      {
        text: '',
        historyIndex: index,
      },
    ];
  }).flatMap((line) => wrapLines(line, width)), [history, width]);
  let contentLines = runLines;
  if (screen === 'history') {
    contentLines = historyLines;
  } else if (screen === 'report') {
    contentLines = completedLines;
  }
  const limit = Math.max(0, contentLines.length - viewportRows);
  const activeHistory = history[Math.min(historyFocus, Math.max(0, history.length - 1))] ?? null;

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

  const invoke = async (operation: () => Promise<boolean>) => {
    if (busy || dispatching.current) {
      return false;
    }
    dispatching.current = true;
    try {
      return await operation();
    } finally {
      dispatching.current = false;
    }
  };

  const clearAnswerActivation = () => {
    answerGate.reset();
  };

  const openRun = async () => {
    if (!activeHistory) {
      return;
    }
    if (!await invoke(() => open(activeHistory.id))) {
      return;
    }
    setHistoryOpen(false);
    setChoiceFocus(0);
    setOffset(0);
  };

  const startRun = async () => {
    const started = await invoke(start);
    if (started) {
      setHistoryOpen(false);
      setChoiceFocus(0);
      setOffset(0);
    }
  };

  const leavePractice = async () => {
    const left = await invoke(leave);
    if (left) {
      setHistoryOpen(true);
      setOffset(0);
      setHistoryFocus(0);
    }
  };

  const moveHistory = (amount: number) => {
    setHistoryFocus((current) => Math.max(0, Math.min(history.length - 1, current + amount)));
  };

  const moveQuestion = async (position: number) => {
    if (!view || view.paused || position === view.position || position < 0
      || position > view.nextUnanswered || position >= view.total) {
      return;
    }
    const changed = await invoke(() => changeView(position));
    if (changed) {
      setChoiceFocus(0);
      setOffset(0);
    }
  };

  const answerChoice = async (displayIndex: number) => {
    const choice = view?.choices[displayIndex];
    if (!view || !view.canAnswer || !choice) {
      return;
    }
    const { runId, position } = view;
    const saved = await invoke(() => answer({
      runId,
      position,
      answerIndex: choice.answerIndex,
    }));
    if (saved) {
      setChoiceFocus(0);
      setOffset(0);
    }
  };

  const togglePause = async () => {
    if (!view) {
      return;
    }
    if (view.paused) {
      const refreshed = await invoke(refresh);
      if (refreshed) {
        await invoke(resume);
      }
      return;
    }
    await invoke(pause);
  };

  const helpLines = [
    'Practice controls',
    'History: j/k or arrows selects a saved run, gg/G or Home/End reaches the boundaries, '
      + `Enter opens it, and n starts a new ${practiceLength}-question run.`,
    'During a run, h/l or left/right move through available questions. '
      + 'The last available question is the next unanswered one; recorded answers are read-only.',
    'On the current unanswered single-answer question, j/k selects a choice; Enter, a-d, or 1-4 '
      + 'saves exactly that choice immediately. Holding an answer key does not answer another question.',
    'For multiple-answer questions, every choice activation saves immediately: use Enter or Space '
      + 'for the focused choice, or a-d and 1-4 for a specific choice. Correct selections remain visible.',
    'On legacy terminals, move choice focus with j/k before reusing the same answer shortcut.',
    'p pauses a run or refreshes and resumes a paused run. Esc returns to history only after '
      + 'the run is safely left.',
    'Completed reports show every question, the dataset mapping, selected answers, correct answers, '
      + 'and justifications. j/k scrolls the report.',
  ].flatMap((text) => wrapLines({ text }, width));
  const helpLimit = Math.max(0, helpLines.length - viewportRows);
  useInput(async (input, key) => {
    if (key.eventType === 'release') {
      let releasedKey = input;
      if (key.return) {
        releasedKey = 'Enter';
      } else if (input === ' ') {
        releasedKey = 'Space';
      }
      answerGate.accept(releasedKey, key.eventType);
      return;
    }
    if (key.meta || key.super || key.hyper) {
      return;
    }
    if (key.ctrl) {
      if (input === 'd' || input === 'u') {
        const step = Math.max(1, Math.floor(viewportRows / 2));
        const maximum = showHelp ? helpLimit : limit;
        setOffset((current) => Math.max(0, Math.min(
          maximum,
          current + (input === 'd' ? step : -step),
        )));
      }
      return;
    }
    if (input === 'q') {
      clearAnswerActivation();
      onQuit();
      return;
    }
    if (startup.status !== 'ready') {
      if (key.escape || input === 'h') {
        onExit();
      }
      return;
    }
    if (showHelp) {
      if (key.escape || input === '?') {
        clearAnswerActivation();
        setShowHelp(false);
        return;
      }
      if (input === 'j' || key.downArrow) {
        setOffset((current) => Math.min(helpLimit, current + 1));
        return;
      }
      if (input === 'k' || key.upArrow) {
        setOffset((current) => Math.max(0, current - 1));
      }
      return;
    }
    if (input === '?') {
      clearAnswerActivation();
      setOffset(0);
      setShowHelp(true);
      return;
    }
    let navigation = input;
    if (input === 'g') {
      const now = performance.now();
      navigation = firstGAt.current !== null && now - firstGAt.current < 800 ? 'gg' : '';
      firstGAt.current = navigation ? null : now;
    } else {
      firstGAt.current = null;
    }

    if (screen === 'history') {
      if (navigation === 'gg' || key.home) {
        clearAnswerActivation();
        setHistoryFocus(0);
        return;
      }
      if (navigation === 'G' || key.end) {
        clearAnswerActivation();
        setHistoryFocus(Math.max(0, history.length - 1));
        return;
      }
      if (navigation === 'j' || key.downArrow) {
        clearAnswerActivation();
        moveHistory(1);
        return;
      }
      if (navigation === 'k' || key.upArrow) {
        clearAnswerActivation();
        moveHistory(-1);
        return;
      }
      if (navigation === 'n') {
        clearAnswerActivation();
        await startRun();
        return;
      }
      if (key.return || navigation === 'l' || key.rightArrow) {
        clearAnswerActivation();
        await openRun();
        return;
      }
      if (navigation === 'h' || key.leftArrow || key.escape) {
        clearAnswerActivation();
        onExit();
      }
      return;
    }

    if (key.escape && screen === 'report') {
      clearAnswerActivation();
      await leavePractice();
      return;
    }
    if (screen === 'report') {
      if (navigation === 'gg' || key.home) {
        clearAnswerActivation();
        setOffset(0);
        return;
      }
      if (navigation === 'G' || key.end) {
        clearAnswerActivation();
        setOffset(limit);
        return;
      }
      if (navigation === 'j' || key.downArrow) {
        clearAnswerActivation();
        setOffset((current) => Math.min(limit, current + 1));
        return;
      }
      if (navigation === 'k' || key.upArrow) {
        clearAnswerActivation();
        setOffset((current) => Math.max(0, current - 1));
      }
      return;
    }

    if (!view) {
      return;
    }
    if (navigation === 'p') {
      clearAnswerActivation();
      await togglePause();
      return;
    }
    const interaction = questionAction(navigation, key, view.multiple);
    if (!interaction) {
      return;
    }
    switch (interaction.type) {
      case 'question': {
        clearAnswerActivation();
        await moveQuestion(view.position + interaction.step);
        break;
      }
      case 'boundary': {
        clearAnswerActivation();
        setOffset(interaction.end ? limit : 0);
        break;
      }
      case 'back': {
        clearAnswerActivation();
        await leavePractice();
        break;
      }
      case 'choice': {
        clearAnswerActivation();
        if (view.canAnswer) {
          const next = Math.max(0, Math.min(
            view.choices.length - 1,
            focusedChoice + interaction.step,
          ));
          setChoiceFocus(next);
          const line = runLines.findIndex((entry) => entry.choiceIndex === next);
          setOffset(Math.max(0, Math.min(limit, line)));
        } else {
          setOffset((current) => Math.max(0, Math.min(limit, current + interaction.step)));
        }
        break;
      }
      case 'answer': {
        let activation = input;
        if (interaction.index === null) {
          activation = input === ' ' ? 'Space' : 'Enter';
        }
        if (view.canAnswer && answerGate.accept(activation, key.eventType)) {
          await answerChoice(interaction.index ?? focusedChoice);
        }
        break;
      }
      default: {
        break;
      }
    }
  });

  let controls = `${questionControls(view?.multiple ?? false)} · p pause · ? help · q quit`;
  if (screen === 'history') {
    controls = 'j/k focus · gg/G boundaries · Enter open · n new run · h/Esc leave · ? help · q quit';
  } else if (screen === 'report') {
    controls = 'j/k scroll · gg/G boundaries · Esc history · ? help · q quit';
  } else if (view?.canAnswer) {
    controls = `${questionControls(view.multiple)} · p pause`;
  } else if (view?.paused) {
    controls = 'p refresh and resume · Esc history · ? help · q quit';
  }
  const displayLines = showHelp ? helpLines : contentLines;
  const displayLimit = Math.max(0, displayLines.length - viewportRows);
  let displayOffset = Math.min(offset, displayLimit);
  if (!showHelp && screen === 'history') {
    const firstVisible = contentLines.findIndex((line) => line.historyIndex === historyFocus);
    displayOffset = Math.max(0, Math.min(displayLimit, firstVisible));
  }

  if (startup.status === 'loading') {
    return <Text>Opening saved practice storage…</Text>;
  }
  if (startup.status === 'error') {
    return <Text color="red">{`Storage error: ${startup.message}. Esc returns to the menu.`}</Text>;
  }
  const visibleLines = displayLines.slice(displayOffset, displayOffset + viewportRows);

  return (
    <Box flexDirection="column">
      <Text bold>Practice</Text>
      {screen === 'run' && view && (
        <Text color={view.paused ? 'yellow' : undefined}>
          {`Answered ${view.nextUnanswered}/${view.total} · ${formatPracticeDuration(view.elapsedMs)} · `}
          {view.paused ? 'Paused' : 'In progress'}
        </Text>
      )}
      {screen === 'history' && (
        <Text>{`${history.length} saved ${history.length === 1 ? 'run' : 'runs'}`}</Text>
      )}
      {screen === 'report' && report && (
        <Text>
          {`Completed · Score ${report.correctCount}/${report.total} (${report.percentage.toFixed(1)}%)`
            + ` · ${formatPracticeDuration(report.elapsedMs)}`}
        </Text>
      )}
      {showHelp ? <Text bold>Practice help</Text> : null}
      <Box flexDirection="column" marginTop={1}>
        {screen === 'run' && !showHelp && (
          <InkQuestion
            lines={runLines}
            offset={displayOffset}
            rowCount={viewportRows}
            focusedChoice={view?.canAnswer ? focusedChoice : null}
          />
        )}
        {screen === 'history' && history.length === 0 && !showHelp && (
          <Text>{`No saved practice runs. Press n to start a ${practiceLength}-question run.`}</Text>
        )}
        {(screen !== 'run' || showHelp) && visibleLines.map((line, index) => {
          const absolute = displayOffset + index;
          const historyRow = screen === 'history' && line.historyIndex === historyFocus;
          const { text } = line;
          return (
            <Text
              color={line.color}
              inverse={historyRow}
              key={`${absolute}-${line.text}`}
            >
              {text}
            </Text>
          );
        })}
      </Box>
      {(busy || pending) && <Text>Saving practice progress…</Text>}
      {practiceError && <Text color="red">{`Practice error: ${practiceError}`}</Text>}
      {!showHelp && (
        <Box marginTop={screen === 'history' ? 0 : 1}>
          <Text dimColor>{controls}</Text>
        </Box>
      )}
      {showHelp && <Text dimColor>? or Esc closes help · q quit</Text>}
    </Box>
  );
}

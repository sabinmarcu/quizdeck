import {
  useAtomValue,
  useSetAtom,
} from 'jotai';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { formatPracticeDuration } from '../data/practice';
import { startupAtom } from '../state/application';
import { learningAnswerIndex } from '../state/learning';
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
  resumePracticeAtom,
  startPracticeAtom,
  viewPracticeAtom,
} from '../state/practice';
import { Markdown } from './Markdown';
import {
  answer,
  answerLabel,
  answers,
  button,
  controls,
  error,
  header,
  heading,
  history,
  historyRow,
  metadata,
  notice,
  outcome,
  question,
  reportChoice,
  reportList,
  reportQuestion,
  reportText,
  root,
  secondaryButton,
  shortcutHelp,
} from './Practice.css';

const practiceStatusLabels = {
  active: 'Active practice run',
  completed: 'Completed practice run',
  paused: 'Paused practice run',
} as const;

function isEditingTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.matches('input, textarea, select')
    || target.closest<HTMLElement>('[contenteditable]')?.isContentEditable === true;
}

export namespace Practice {
  export interface Props {
    keyboardEnabled: boolean;
    onExit(): Promise<void>;
  }
}

export function Practice({ keyboardEnabled, onExit }: Practice.Props) {
  const historyEntries = useAtomValue(practiceHistoryAtom);
  const view = useAtomValue(practiceViewAtom);
  const report = useAtomValue(practiceReportAtom);
  const busy = useAtomValue(practiceBusyAtom);
  const practiceError = useAtomValue(practiceErrorAtom);
  const startup = useAtomValue(startupAtom);
  const currentTotal = startup.status === 'ready' ? Math.min(60, startup.set.questionCount) : 0;
  const manuallyPaused = useRef(false);
  const start = useSetAtom(startPracticeAtom);
  const open = useSetAtom(openPracticeAtom);
  const answerQuestion = useSetAtom(answerPracticeAtom);
  const changeView = useSetAtom(viewPracticeAtom);
  const pause = useSetAtom(pausePracticeAtom);
  const resume = useSetAtom(resumePracticeAtom);
  const leave = useSetAtom(leavePracticeAtom);
  const questionHeadingReference = useRef<HTMLHeadingElement>(null);
  const historyHeadingReference = useRef<HTMLHeadingElement>(null);
  const firstGAt = useRef<number | null>(null);
  const automaticallyPaused = useRef(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [historyFocus, setHistoryFocus] = useState(0);
  const [choiceFocus, setChoiceFocus] = useState(0);
  const historyButtons = useRef(new Map<number, HTMLButtonElement>());
  const choiceButtons = useRef(new Map<number, HTMLButtonElement>());

  const focusQuestion = useCallback(() => {
    requestAnimationFrame(() => { questionHeadingReference.current?.focus(); });
  }, []);

  const focusHistory = useCallback(() => {
    requestAnimationFrame(() => { historyHeadingReference.current?.focus(); });
  }, []);

  const focusHistoryItem = useCallback((index: number) => {
    const bounded = Math.max(0, Math.min(historyEntries.length, index));
    setHistoryFocus(bounded);
    historyButtons.current.get(bounded)?.focus();
  }, [historyEntries.length]);

  const focusChoice = useCallback((index: number) => {
    const bounded = Math.max(0, Math.min((view?.choices.length ?? 1) - 1, index));
    setChoiceFocus(bounded);
    choiceButtons.current.get(bounded)?.focus();
  }, [view?.choices.length]);

  const startRun = useCallback(async () => {
    if (busy) {
      return;
    }
    manuallyPaused.current = false;
    automaticallyPaused.current = false;
    if (await start()) {
      setChoiceFocus(0);
      focusQuestion();
    }
  }, [busy, focusQuestion, start]);

  const openRun = useCallback(async (runId: string) => {
    if (busy) {
      return;
    }
    manuallyPaused.current = false;
    automaticallyPaused.current = false;
    if (await open(runId)) {
      setChoiceFocus(0);
      focusQuestion();
    }
  }, [busy, focusQuestion, open]);

  const returnToHistory = useCallback(async () => {
    if (busy) {
      return;
    }
    manuallyPaused.current = false;
    automaticallyPaused.current = false;
    if (await leave()) {
      focusHistory();
    }
  }, [busy, focusHistory, leave]);

  const commitAnswer = useCallback(async (displayIndex: number) => {
    const choice = view?.choices[displayIndex];
    if (!view || !view.canAnswer || busy || !choice || choice.selected) {
      return;
    }
    if (await answerQuestion({
      runId: view.runId,
      position: view.position,
      answerIndex: choice.answerIndex,
    })) {
      setChoiceFocus(0);
      focusQuestion();
    }
  }, [answerQuestion, busy, focusQuestion, view]);

  const moveQuestion = useCallback(async (position: number) => {
    if (!view || view.paused || busy || position < 0 || position > view.nextUnanswered) {
      return;
    }
    if (await changeView(position)) {
      setChoiceFocus(0);
      focusQuestion();
    }
  }, [busy, changeView, focusQuestion, view]);

  const manuallyPause = useCallback(async () => {
    if (busy) {
      return;
    }
    manuallyPaused.current = true;
    automaticallyPaused.current = false;
    await pause();
  }, [busy, pause]);

  const manuallyResume = useCallback(async () => {
    if (busy) {
      return;
    }
    manuallyPaused.current = false;
    automaticallyPaused.current = false;
    if (await resume()) {
      focusQuestion();
    }
  }, [busy, focusQuestion, resume]);

  const pauseAutomatically = useCallback(async () => {
    if (!view || manuallyPaused.current || automaticallyPaused.current) {
      return;
    }
    automaticallyPaused.current = true;
    await pause();
  }, [pause, view]);

  const resumeAutomatically = useCallback(async () => {
    if (!keyboardEnabled || practiceError || !view || !view.paused || !automaticallyPaused.current
      || document.visibilityState !== 'visible' || !document.hasFocus()) {
      return;
    }
    if (await resume()) {
      automaticallyPaused.current = false;
      focusQuestion();
    }
  }, [focusQuestion, keyboardEnabled, practiceError, resume, view]);

  useEffect(() => {
    if (!keyboardEnabled || document.visibilityState !== 'visible' || !document.hasFocus()) {
      pauseAutomatically();
      return;
    }
    resumeAutomatically();
  }, [keyboardEnabled, pauseAutomatically, resumeAutomatically]);

  useEffect(() => {
    const pauseForVisibility = () => {
      pauseAutomatically();
    };
    const resumeForVisibility = () => {
      resumeAutomatically();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        pauseForVisibility();
      } else {
        resumeForVisibility();
      }
    };
    window.addEventListener('blur', pauseForVisibility);
    window.addEventListener('focus', resumeForVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', pauseForVisibility);
      window.removeEventListener('focus', resumeForVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pauseAutomatically, resumeAutomatically]);

  useEffect(() => {
    const handleKey = async (event: KeyboardEvent) => {
      const menuTarget = event.target instanceof Element
        && event.target.closest('[data-app-navigation]') !== null;
      if (!keyboardEnabled || menuTarget || event.isComposing || isEditingTarget(event.target)
        || event.altKey || event.metaKey) {
        return;
      }
      if (event.ctrlKey) {
        if (event.key === 'd' || event.key === 'u') {
          event.preventDefault();
          window.scrollBy({
            top: (event.key === 'd' ? 1 : -1) * (window.innerHeight / 2),
            behavior: 'instant',
          });
        }
        return;
      }
      if (helpOpen) {
        if (event.key === 'Escape' || event.key === '?') {
          event.preventDefault();
          setHelpOpen(false);
        } else if (['j', 'k', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
          event.preventDefault();
          window.scrollBy({ top: ['j', 'ArrowDown'].includes(event.key) ? 64 : -64 });
        }
        return;
      }
      if (event.key === 'g') {
        const now = performance.now();
        if (firstGAt.current !== null && now - firstGAt.current < 800) {
          firstGAt.current = null;
          event.preventDefault();
          if (!view && !report) {
            focusHistoryItem(0);
          } else if (view?.canAnswer) {
            focusChoice(0);
          } else {
            window.scrollTo({
              top: 0,
              behavior: 'instant',
            });
          }
        } else {
          firstGAt.current = now;
        }
        return;
      }
      firstGAt.current = null;
      if (event.key === 'G' || event.key === 'End') {
        event.preventDefault();
        if (!view && !report) {
          focusHistoryItem(historyEntries.length);
        } else if (view?.canAnswer) {
          focusChoice(view.choices.length - 1);
        } else {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'instant',
          });
        }
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        setHelpOpen((openHelp) => !openHelp);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        if (view || report) {
          await returnToHistory();
        } else {
          await onExit();
        }
        return;
      }
      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault();
        if (!view && !report) {
          focusHistoryItem(historyFocus + 1);
        } else if (view?.canAnswer) {
          focusChoice(choiceFocus + 1);
        } else {
          window.scrollBy({
            top: 64,
            behavior: 'instant',
          });
        }
        return;
      }
      if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!view && !report) {
          focusHistoryItem(historyFocus - 1);
        } else if (view?.canAnswer) {
          focusChoice(choiceFocus - 1);
        } else {
          window.scrollBy({
            top: -64,
            behavior: 'instant',
          });
        }
        return;
      }
      if (!view && !report) {
        if (event.key === 'n') {
          event.preventDefault();
          await startRun();
        } else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
          event.preventDefault();
          const selected = historyEntries[historyFocus - 1];
          if (selected) {
            await openRun(selected.id);
          } else {
            await startRun();
          }
        }
        return;
      }
      if (event.key === 'p' && view) {
        event.preventDefault();
        if (view.paused) {
          await manuallyResume();
        } else {
          await manuallyPause();
        }
        return;
      }
      if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)
        && !(event.target instanceof HTMLAnchorElement) && view?.canAnswer && !event.repeat) {
        event.preventDefault();
        await commitAnswer(choiceFocus);
        return;
      }
      if (event.key === 'h' || event.key === 'ArrowLeft') {
        if (view?.canPrevious) {
          event.preventDefault();
          await moveQuestion(view.position - 1);
        }
        return;
      }
      if (event.key === 'l' || event.key === 'ArrowRight') {
        if (view?.canNext) {
          event.preventDefault();
          await moveQuestion(view.position + 1);
        }
        return;
      }
      const answerIndex = learningAnswerIndex(event.key);
      if (answerIndex === null || event.repeat || !view?.canAnswer || !view.choices[answerIndex]) {
        return;
      }
      event.preventDefault();
      await commitAnswer(answerIndex);
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); };
  }, [choiceFocus,
    commitAnswer,
    focusChoice,
    focusHistoryItem,
    helpOpen,
    historyEntries,
    historyFocus,
    keyboardEnabled,
    manuallyPause,
    manuallyResume,
    moveQuestion,
    onExit,
    openRun,
    report,
    returnToHistory,
    startRun,
    view]);

  const helpPanel = helpOpen && (
    <aside className={shortcutHelp} aria-label="Practice keyboard help">
      <strong>Practice keyboard help</strong>
      <span>History: j/k focuses actions, Enter opens, n starts a new run, gg/G reaches ends.</span>
      <span>
        Questions: j/k focuses choices. Use a–d/1–4 or Enter to select a choice. Every selection
        is accepted immediately: an incorrect choice advances, while correct choices accumulate
        until all are selected. Enter or Space activates a focused choice.
      </span>
      <span>p pauses/resumes; Escape returns to history.</span>
      <span>Reports: j/k reads, gg/G reaches ends; Ctrl-d/u scrolls half a page.</span>
      <button className={secondaryButton} type="button" onClick={() => { setHelpOpen(false); }}>
        Close help
      </button>
    </aside>
  );

  if (report) {
    return (
      <section className={root} aria-labelledby="practice-report-heading">
        <header className={header}>
          <h2
            ref={questionHeadingReference}
            className={heading}
            id="practice-report-heading"
            tabIndex={-1}
          >
            Practice report
          </h2>
          <p className={metadata}>
            <span>
              {report.correctCount}
              {' '}
              of
              {' '}
              {report.total}
              {' '}
              correct
            </span>
            <span>
              {report.percentage.toFixed(1)}
              %
            </span>
            <span>{formatPracticeDuration(report.elapsedMs)}</span>
          </p>
          <time dateTime={new Date(report.completedAt).toISOString()}>
            Completed
            {' '}
            {new Date(report.completedAt).toLocaleString()}
          </time>
        </header>
        <div className={controls}>
          <button
            className={secondaryButton}
            disabled={busy}
            type="button"
            onClick={returnToHistory}
          >
            Back to practice history
          </button>
          <button className={secondaryButton} type="button" onClick={() => { setHelpOpen(true); }}>
            Keyboard help
          </button>
        </div>
        {helpPanel}
        <ol className={reportList} aria-label="Completed practice questions">
          {report.questions.map((questionEntry) => (
            <li key={`${report.runId}-${questionEntry.position}`}>
              <article className={reportQuestion} data-outcome={questionEntry.outcome}>
                <header className={header}>
                  <p className={outcome} data-outcome={questionEntry.outcome}>
                    {questionEntry.outcome === 'correctly_answered' ? 'Correct' : 'Incorrect'}
                  </p>
                  <h3 className={`${heading} ${outcome}`} data-outcome={questionEntry.outcome}>
                    Practice question
                    {' '}
                    {questionEntry.position}
                    {' '}
                    → Dataset question
                    {' '}
                    {questionEntry.questionId}
                  </h3>
                  <div className={reportText}>
                    <Markdown headingLevel={4}>{questionEntry.description}</Markdown>
                  </div>
                </header>
                <ol
                  className={answers}
                  aria-label={`Answers for practice question ${questionEntry.position}`}
                >
                  {questionEntry.choices.map((choice, index) => (
                    <li key={`${questionEntry.position}-${choice.text}`}>
                      <div className={reportChoice} data-correct={choice.correct}>
                        <strong>
                          {String.fromCodePoint(65 + index)}
                          .
                          {' '}
                          <Markdown mode="inline">{choice.text}</Markdown>
                        </strong>
                        <span>{choice.selected ? 'Selected answer.' : 'Not selected.'}</span>
                        <span>{choice.correct ? 'Correct answer.' : 'Incorrect answer.'}</span>
                        {choice.justification && (
                          <div>
                            <strong>Explanation</strong>
                            <Markdown headingLevel={4}>{choice.justification}</Markdown>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                {questionEntry.justification && (
                  <div className={reportText}>
                    <strong>Explanation</strong>
                    <Markdown headingLevel={4}>{questionEntry.justification}</Markdown>
                  </div>
                )}
              </article>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (view) {
    return (
      <section className={root} aria-labelledby="practice-question-heading">
        <div className={question}>
          <header className={header}>
            <h2
              ref={questionHeadingReference}
              className={heading}
              id="practice-question-heading"
              tabIndex={-1}
            >
              Practice question
              {' '}
              {view.position + 1}
              {' '}
              of
              {' '}
              {view.total}
            </h2>
            <p className={metadata}>
              <span>{formatPracticeDuration(view.elapsedMs)}</span>
              <span>{view.paused ? 'Paused' : 'In progress'}</span>
            </p>
            <div className={reportText}>
              <Markdown>{view.description}</Markdown>
            </div>
          </header>
          {practiceError && <p className={error} role="alert">{practiceError}</p>}
          {view.paused && (
            <p className={notice}>
              Practice is paused. Resume to continue answering or navigating.
            </p>
          )}
          <ol className={answers} aria-label="Practice answer choices">
            {view.choices.map((choice, index) => {
              const { selected } = choice;
              return (
                <li key={`${view.position}-${choice.text}`}>
                  <button
                    ref={(element) => {
                      if (element) {
                        choiceButtons.current.set(index, element);
                      } else {
                        choiceButtons.current.delete(index);
                      }
                    }}
                    aria-pressed={selected}
                    className={answer}
                    disabled={!view.canAnswer || busy || selected}
                    type="button"
                    onClick={async () => { await commitAnswer(index); }}
                    onFocus={() => { setChoiceFocus(index); }}
                  >
                    <span className={answerLabel}>
                      {String.fromCodePoint(65 + index)}
                      .
                      {' '}
                      <Markdown mode="inline">{choice.text}</Markdown>
                    </span>
                    {selected && <span>Selected answer.</span>}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className={controls}>
            <button
              className={secondaryButton}
              disabled={!view.canPrevious || view.paused || busy}
              type="button"
              onClick={async () => { await moveQuestion(view.position - 1); }}
            >
              Previous question
            </button>
            <button
              className={secondaryButton}
              disabled={!view.canNext || view.paused || busy}
              type="button"
              onClick={async () => { await moveQuestion(view.position + 1); }}
            >
              Next question
            </button>
            {view.paused
              ? (
                <button className={button} disabled={busy} type="button" onClick={manuallyResume}>
                  Resume practice
                </button>
              )
              : (
                <button
                  className={secondaryButton}
                  disabled={busy}
                  type="button"
                  onClick={manuallyPause}
                >
                  Pause practice
                </button>
              )}
            <button
              className={secondaryButton}
              disabled={busy}
              type="button"
              onClick={returnToHistory}
            >
              Back to practice history
            </button>
            <button
              className={secondaryButton}
              type="button"
              onClick={() => { setHelpOpen((openHelp) => !openHelp); }}
            >
              Keyboard help
            </button>
          </div>
          {helpPanel}
        </div>
      </section>
    );
  }

  return (
    <section className={root} aria-labelledby="practice-history-heading">
      <header className={header}>
        <h2
          ref={historyHeadingReference}
          className={heading}
          id="practice-history-heading"
          tabIndex={-1}
        >
          Practice
        </h2>
        <p>
          Complete
          {' '}
          {currentTotal}
          {' '}
          questions in a saved randomized order. Every choice is accepted immediately: an
          incorrect choice advances, while correct choices on multiple-answer questions accumulate
          until all are selected.
        </p>
      </header>
      {practiceError && <p className={error} role="alert">{practiceError}</p>}
      <div className={controls}>
        <button
          className={button}
          ref={(element) => {
            if (element) {
              historyButtons.current.set(0, element);
            } else {
              historyButtons.current.delete(0);
            }
          }}
          disabled={busy}
          type="button"
          onClick={startRun}
          onFocus={() => { setHistoryFocus(0); }}
        >
          Start new practice run
        </button>
        <button className={secondaryButton} type="button" onClick={() => { setHelpOpen(true); }}>
          Keyboard help
        </button>
      </div>
      {helpPanel}
      {historyEntries.length === 0
        ? <p className={notice}>No practice runs have been saved yet.</p>
        : (
          <ol className={history} aria-label="Saved practice runs">
            {historyEntries.map((entry, index) => (
              <li className={historyRow} key={entry.id}>
                <strong>{practiceStatusLabels[entry.status]}</strong>
                <time dateTime={new Date(entry.createdAt).toISOString()}>
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
                <span className={reportText}>
                  Run
                  {entry.id}
                </span>
                <span>
                  {entry.answeredCount}
                  {' '}
                  of
                  {' '}
                  {entry.total}
                  {' '}
                  answered ·
                  {formatPracticeDuration(entry.elapsedMs)}
                </span>
                {entry.score && (
                  <span>
                    {entry.score.correctCount}
                    {' '}
                    correct ·
                    {' '}
                    {entry.score.percentage.toFixed(1)}
                    %
                  </span>
                )}
                <button
                  className={secondaryButton}
                  ref={(element) => {
                    if (element) {
                      historyButtons.current.set(index + 1, element);
                    } else {
                      historyButtons.current.delete(index + 1);
                    }
                  }}
                  disabled={busy}
                  type="button"
                  onClick={async () => { await openRun(entry.id); }}
                  onFocus={() => { setHistoryFocus(index + 1); }}
                >
                  {entry.status === 'completed' ? 'Review report' : 'Resume practice'}
                </button>
              </li>
            ))}
          </ol>
        )}
    </section>
  );
}

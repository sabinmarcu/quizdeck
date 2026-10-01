import {
  useAtom,
  useAtomValue,
  useSetAtom,
} from 'jotai';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  actionErrorAtom,
  pendingAtom,
} from '../state/application';
import {
  answerLearningAtom,
  learningAdjacentAtom,
  learningAnswerIndex,
  learningCountsAtom,
  learningDetailAtom,
  learningFilterAtom,
  learningFilters,
  learningFocusedIdAtom,
  learningQuestionIdAtom,
  learningQueryAtom,
  learningResetOpenAtom,
  learningRowsAtom,
  learningStatusLabels,
  openLearningQuestionAtom,
  resetLearningAtom,
} from '../state/learning';
import { LearningDialogs } from './Learning.Dialogs';
import {
  answer,
  answerLabel,
  answerList,
  button,
  buttonRow,
  controls,
  counts,
  empty,
  feedback,
  feedbackText,
  filter,
  input,
  question,
  questionHeading,
  questionText,
  results,
  root,
  rowButton,
  rowMeta,
  search,
  secondaryButton,
  select,
} from './Learning.css';

const answerKeys = ['a', 'b', 'c', 'd'] as const;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.matches('input, textarea, select')
    || target.closest<HTMLElement>('[contenteditable]')?.isContentEditable === true;
}

export namespace Learning {
  export interface Props {
    onExit(): void;
    keyboardEnabled: boolean;
  }
}

export function Learning({ onExit, keyboardEnabled }: Learning.Props) {
  const [query, setQuery] = useAtom(learningQueryAtom);
  const [filterValue, setFilterValue] = useAtom(learningFilterAtom);
  const [focusedId, setFocusedId] = useAtom(learningFocusedIdAtom);
  const [questionId, setQuestionId] = useAtom(learningQuestionIdAtom);
  const [resetOpen, setResetOpen] = useAtom(learningResetOpenAtom);
  const rows = useAtomValue(learningRowsAtom);
  const countsValue = useAtomValue(learningCountsAtom);
  const detail = useAtomValue(learningDetailAtom);
  const { previous: previousDetailId, next: nextDetailId } = useAtomValue(learningAdjacentAtom);
  const pending = useAtomValue(pendingAtom);
  const actionError = useAtomValue(actionErrorAtom);
  const openQuestion = useSetAtom(openLearningQuestionAtom);
  const answerQuestion = useSetAtom(answerLearningAtom);
  const resetLearning = useSetAtom(resetLearningAtom);
  const setActionError = useSetAtom(actionErrorAtom);
  const searchInputReference = useRef<HTMLInputElement>(null);
  const listButtonReferences = useRef(new Map<number, HTMLButtonElement>());
  const answerButtonReferences = useRef(new Map<number, HTMLButtonElement>());
  const resetButtonReference = useRef<HTMLButtonElement>(null);
  const resetDialogReference = useRef<HTMLDialogElement>(null);
  const cancelResetReference = useRef<HTMLButtonElement>(null);
  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const rowIdSet = useMemo(() => new Set(rowIds), [rowIds]);
  const helpButtonReference = useRef<HTMLButtonElement>(null);
  const helpDialogReference = useRef<HTMLDialogElement>(null);
  const helpCloseReference = useRef<HTMLButtonElement>(null);
  const priorRowsReference = useRef<number[]>([]);
  const firstGAt = useRef<number | null>(null);
  const restoreResetFocus = useRef(false);
  const restoreHelpFocus = useRef(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [answerFocus, setAnswerFocus] = useState(0);

  useEffect(() => {
    if (questionId !== null || rows.length === 0
      || (focusedId !== null && rowIdSet.has(focusedId))) {
      return;
    }
    const priorIndex = focusedId === null ? 0 : priorRowsReference.current.indexOf(focusedId);
    const boundedIndex = Math.max(0, Math.min(priorIndex, rows.length - 1));
    setFocusedId(rows[boundedIndex]?.id ?? null);
  }, [focusedId, questionId, rowIdSet, rows, setFocusedId]);
  useEffect(() => {
    priorRowsReference.current = rowIds;
  }, [rowIds]);

  useEffect(() => {
    const dialogElement = resetDialogReference.current;
    if (!dialogElement) {
      return;
    }
    if (resetOpen && !dialogElement.open) {
      dialogElement.showModal();
      cancelResetReference.current?.focus();
    }
    if (!resetOpen && dialogElement.open) {
      dialogElement.close();
    }
  }, [resetOpen]);

  useEffect(() => {
    const dialogElement = helpDialogReference.current;
    if (!dialogElement) {
      return;
    }
    if (helpOpen && !dialogElement.open) {
      dialogElement.showModal();
      helpCloseReference.current?.focus();
    }
    if (!helpOpen && dialogElement.open) {
      dialogElement.close();
    }
  }, [helpOpen]);

  useEffect(() => {
    if (!restoreResetFocus.current) {
      return;
    }
    restoreResetFocus.current = false;
    resetButtonReference.current?.focus();
  }, [resetOpen]);

  useEffect(() => {
    if (!restoreHelpFocus.current) {
      return;
    }
    restoreHelpFocus.current = false;
    helpButtonReference.current?.focus();
  }, [helpOpen]);

  const focusRow = useCallback((id: number) => {
    setFocusedId(id);
    listButtonReferences.current.get(id)?.focus();
  }, [setFocusedId]);

  const returnToList = useCallback(() => {
    setQuestionId(null);
    const fallbackId = rowIdSet.has(focusedId ?? -1)
      ? focusedId
      : rows[0]?.id;
    if (fallbackId === undefined || fallbackId === null) {
      return;
    }
    requestAnimationFrame(() => { focusRow(fallbackId); });
  }, [focusedId, focusRow, rowIdSet, rows, setQuestionId]);

  const openFocusedQuestion = useCallback((id: number) => {
    openQuestion(id);
    setAnswerFocus(0);
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('#learning-question')?.focus();
    });
  }, [openQuestion]);

  const closeResetDialog = useCallback(() => {
    if (pending) {
      return;
    }
    restoreResetFocus.current = true;
    setActionError(null);
    setResetOpen(false);
  }, [pending, setActionError, setResetOpen]);

  const closeHelpDialog = useCallback(() => {
    restoreHelpFocus.current = true;
    setHelpOpen(false);
  }, []);

  const commitAnswer = useCallback(async (answerIndex: number) => {
    if (!detail || detail.status !== 'unanswered' || pending) {
      return;
    }
    const saved = await answerQuestion({
      questionId: detail.id,
      answerIndex,
    });
    if (saved) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('#learning-question')?.focus();
      });
    }
  }, [answerQuestion, detail, pending]);

  const moveDetail = useCallback((id: number | null) => {
    if (id === null) {
      return;
    }
    openFocusedQuestion(id);
  }, [openFocusedQuestion]);

  useEffect(() => {
    const handleKey = async (event: KeyboardEvent) => {
      const menuTarget = event.target instanceof Element
        && event.target.closest('[data-app-navigation]') !== null;
      if (!keyboardEnabled || menuTarget || event.isComposing) {
        return;
      }
      if (helpOpen) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeHelpDialog();
        }
        return;
      }
      if (resetOpen) {
        return;
      }
      if (isEditableTarget(event.target)) {
        if (event.key === 'Escape' && event.target === searchInputReference.current) {
          event.preventDefault();
          searchInputReference.current?.blur();
          if (focusedId !== null && rowIdSet.has(focusedId)) {
            focusRow(focusedId);
          }
        }
        return;
      }
      if (event.altKey || event.metaKey) {
        return;
      }
      if (event.ctrlKey) {
        if (event.key === 'd' || event.key === 'u') {
          event.preventDefault();
          window.scrollBy({
            top: (event.key === 'd' ? 1 : -1) * (window.innerHeight / 2),
            behavior: 'auto',
          });
        }
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        searchInputReference.current?.focus();
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        if (questionId !== null) {
          returnToList();
        } else {
          onExit();
        }
        return;
      }
      if (event.key === 'g') {
        const now = performance.now();
        if (firstGAt.current !== null && now - firstGAt.current < 800) {
          firstGAt.current = null;
          event.preventDefault();
          if (questionId === null && rows[0]) {
            focusRow(rows[0].id);
          }
          if (questionId !== null && detail?.choices.length) {
            setAnswerFocus(0);
            answerButtonReferences.current.get(0)?.focus();
          }
        } else {
          firstGAt.current = now;
        }
        return;
      }
      firstGAt.current = null;
      if (questionId === null) {
        const currentIndex = focusedId === null ? -1 : rowIds.indexOf(focusedId);
        if (event.key === 'j' || event.key === 'ArrowDown') {
          const nextRow = rows[Math.min(rows.length - 1, currentIndex + 1)];
          if (nextRow) {
            event.preventDefault();
            focusRow(nextRow.id);
          }
          return;
        }
        if (event.key === 'k' || event.key === 'ArrowUp') {
          const previousRow = rows[Math.max(0, currentIndex - 1)];
          if (previousRow) {
            event.preventDefault();
            focusRow(previousRow.id);
          }
          return;
        }
        if (event.key === 'G' || event.key === 'End') {
          const lastRow = rows.at(-1);
          if (lastRow) {
            event.preventDefault();
            focusRow(lastRow.id);
          }
          return;
        }
        if (event.key === 'h' || event.key === 'ArrowLeft') {
          event.preventDefault();
          onExit();
          return;
        }
        if (event.key === 'l' || event.key === 'ArrowRight') {
          const id = focusedId !== null && rowIdSet.has(focusedId) ? focusedId : rows[0]?.id;
          if (id !== undefined) {
            event.preventDefault();
            openFocusedQuestion(id);
          }
          return;
        }
        if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
          const id = focusedId !== null && rowIdSet.has(focusedId) ? focusedId : rows[0]?.id;
          if (id !== undefined) {
            event.preventDefault();
            openFocusedQuestion(id);
          }
        }
        return;
      }
      if (event.key === 'h' || event.key === 'ArrowLeft') {
        event.preventDefault();
        moveDetail(previousDetailId);
        return;
      }
      if (event.key === 'l' || event.key === 'ArrowRight') {
        if (nextDetailId !== null) {
          event.preventDefault();
          moveDetail(nextDetailId);
        }
        return;
      }
      if (detail?.status !== 'unanswered'
        && ['j', 'k', 'ArrowDown', 'ArrowUp', 'G', 'End', 'Home'].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'G' || event.key === 'End') {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'auto',
          });
        } else if (event.key === 'Home') {
          window.scrollTo({
            top: 0,
            behavior: 'auto',
          });
        } else {
          window.scrollBy({ top: ['j', 'ArrowDown'].includes(event.key) ? 48 : -48 });
        }
        return;
      }
      if (event.key === 'j' || event.key === 'ArrowDown') {
        if (detail && detail.choices.length > 0) {
          event.preventDefault();
          const nextIndex = Math.min(detail.choices.length - 1, answerFocus + 1);
          setAnswerFocus(nextIndex);
          answerButtonReferences.current.get(nextIndex)?.focus();
        }
        return;
      }
      if (event.key === 'k' || event.key === 'ArrowUp') {
        if (detail && detail.choices.length > 0) {
          event.preventDefault();
          const previousIndex = Math.max(0, answerFocus - 1);
          setAnswerFocus(previousIndex);
          answerButtonReferences.current.get(previousIndex)?.focus();
        }
        return;
      }
      if (event.key === 'G' || event.key === 'End') {
        if (detail && detail.choices.length > 0) {
          event.preventDefault();
          const lastIndex = detail.choices.length - 1;
          setAnswerFocus(lastIndex);
          answerButtonReferences.current.get(lastIndex)?.focus();
        }
        return;
      }
      if (event.key === 'Home') {
        if (detail && detail.choices.length > 0) {
          event.preventDefault();
          setAnswerFocus(0);
          answerButtonReferences.current.get(0)?.focus();
        }
        return;
      }
      if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) {
        return;
      }
      const index = learningAnswerIndex(event.key);
      if (detail && index !== null && index < detail.choices.length) {
        event.preventDefault();
        await commitAnswer(index);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); };
  }, [
    answerFocus,
    closeHelpDialog,
    keyboardEnabled,
    commitAnswer,
    detail,
    focusRow,
    focusedId,
    helpOpen,
    moveDetail,
    nextDetailId,
    previousDetailId,
    onExit,
    openFocusedQuestion,
    questionId,
    resetOpen,
    returnToList,
    rowIdSet,
    rowIds,
    rows,
  ]);

  const openResetDialog = () => {
    setActionError(null);
    setResetOpen(true);
  };

  const confirmReset = async () => {
    const reset = await resetLearning();
    if (reset) {
      restoreResetFocus.current = true;
    }
  };
  const dialogs = (
    <LearningDialogs
      actionError={actionError}
      cancelResetRef={cancelResetReference}
      closeHelpDialog={closeHelpDialog}
      closeResetDialog={closeResetDialog}
      confirmReset={confirmReset}
      helpCloseRef={helpCloseReference}
      helpDialogRef={helpDialogReference}
      pending={pending}
      resetDialogRef={resetDialogReference}
    />
  );

  if (questionId !== null && detail) {
    const answered = detail.status !== 'unanswered';
    return (
      <section className={root} aria-labelledby="learning-question">
        <div className={question}>
          <p className={rowMeta} data-outcome={detail.status}>
            Question
            {' '}
            {detail.id}
            {' '}
            ·
            {' '}
            {learningStatusLabels[detail.status]}
          </p>
          <h2
            className={questionHeading}
            data-outcome={detail.status}
            id="learning-question"
            tabIndex={-1}
          >
            Question
            {' '}
            {detail.id}
          </h2>
          <p className={questionText}>{detail.description}</p>
          <ol className={answerList} aria-label="Answer choices">
            {detail.choices.map((choice, index) => {
              const letter = answerKeys[index] ?? String(index + 1);
              return (
                <li key={`${detail.id}-${choice.text}`}>
                  <button
                    ref={(element) => {
                      if (element) {
                        answerButtonReferences.current.set(index, element);
                      } else {
                        answerButtonReferences.current.delete(index);
                      }
                    }}
                    aria-describedby={choice.feedback
                      ? `feedback-${detail.id}-${index}`
                      : undefined}
                    className={answer}
                    data-correct={choice.feedback?.correct}
                    disabled={answered || pending}
                    type="button"
                    onClick={async () => { await commitAnswer(index); }}
                    onFocus={() => { setAnswerFocus(index); }}
                  >
                    <span className={answerLabel}>
                      {letter.toUpperCase()}
                      .
                      {' '}
                      {choice.text}
                    </span>
                    {choice.feedback && (
                      <span className={feedback} id={`feedback-${detail.id}-${index}`}>
                        <span className={feedbackText}>
                          {choice.feedback.selected && <strong>Selected answer. </strong>}
                          {choice.feedback.correct
                            ? 'Correct answer.'
                            : 'Not the correct answer.'}
                        </span>
                        <span className={feedbackText}>
                          <strong>Explanation: </strong>
                          {choice.feedback.justification}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          {answered && (
            <p className={empty} data-outcome={detail.status} aria-live="polite">
              This answer is saved as
              {' '}
              {learningStatusLabels[detail.status].toLowerCase()}
              .
              Reset all learning progress to answer it again.
            </p>
          )}
          <div className={buttonRow}>
            <button className={secondaryButton} type="button" onClick={returnToList}>
              Back to list
            </button>
            <button
              className={secondaryButton}
              disabled={previousDetailId === null}
              type="button"
              onClick={() => { moveDetail(previousDetailId); }}
            >
              Previous question
            </button>
            <button
              className={secondaryButton}
              disabled={nextDetailId === null}
              type="button"
              onClick={() => { moveDetail(nextDetailId); }}
            >
              Next question
            </button>
            <button
              ref={helpButtonReference}
              className={secondaryButton}
              type="button"
              onClick={() => { setHelpOpen(true); }}
            >
              Keyboard help
            </button>
            <button
              ref={resetButtonReference}
              className={button}
              type="button"
              onClick={openResetDialog}
            >
              Reset all learning progress
            </button>
          </div>
        </div>
        {dialogs}
      </section>
    );
  }

  return (
    <section className={root} aria-labelledby="learning-heading">
      <header>
        <h2 id="learning-heading">Learn</h2>
        <p>Choose each answer once. Feedback appears after your answer is saved.</p>
      </header>
      <div className={controls}>
        <label className={search} htmlFor="learning-search">
          <span>Search questions by number or description</span>
          <input
            ref={searchInputReference}
            className={input}
            id="learning-search"
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); }}
          />
        </label>
        <label className={filter} htmlFor="learning-status">
          <span>Answer status</span>
          <select
            className={select}
            id="learning-status"
            value={filterValue}
            onChange={(event) => { setFilterValue(event.target.value as typeof filterValue); }}
          >
            {learningFilters.map((filterName) => (
              <option key={filterName} value={filterName}>
                {learningStatusLabels[filterName]}
              </option>
            ))}
          </select>
        </label>
        <div className={buttonRow}>
          <button
            className={secondaryButton}
            disabled={query.length === 0}
            type="button"
            onClick={() => { setQuery(''); }}
          >
            Clear search
          </button>
          <button
            ref={helpButtonReference}
            className={secondaryButton}
            type="button"
            onClick={() => { setHelpOpen(true); }}
          >
            Keyboard help
          </button>
          <button
            ref={resetButtonReference}
            className={button}
            type="button"
            onClick={openResetDialog}
          >
            Reset all learning progress
          </button>
        </div>
      </div>
      <p className={counts}>
        <span>
          {countsValue.completed}
          {' '}
          of
          {' '}
          {countsValue.total}
          {' '}
          answered.
        </span>
        <span>
          {rows.length}
          {' '}
          result
          {rows.length === 1 ? '' : 's'}
          .
        </span>
      </p>
      {rows.length === 0
        ? (
          <p className={empty}>No questions match this search and answer-status filter.</p>
        )
        : (
          <ol className={results} aria-label="Matching questions">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  ref={(element) => {
                    if (element) {
                      listButtonReferences.current.set(row.id, element);
                    } else {
                      listButtonReferences.current.delete(row.id);
                    }
                  }}
                  aria-current={focusedId === row.id}
                  className={rowButton}
                  data-outcome={row.status}
                  type="button"
                  onClick={() => { openFocusedQuestion(row.id); }}
                  onFocus={() => { setFocusedId(row.id); }}
                >
                  <span className={rowMeta} data-outcome={row.status}>
                    Question
                    {' '}
                    {row.id}
                    {' '}
                    ·
                    {' '}
                    {learningStatusLabels[row.status]}
                  </span>
                  <span>{row.description}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      {dialogs}
    </section>
  );
}

import {
  useAtomValue,
  useSetAtom,
  useStore,
} from 'jotai';
import type {
  ChangeEvent,
  ReactNode,
  RefObject,
} from 'react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  parseQuestionSet,
  QuestionSetParseError,
} from '../data/question-set-file';
import {
  actionErrorAtom,
  loadQuestionSetAtom,
  startupAtom,
} from '../state/application';
import {
  action,
  dialog,
  dialogActions,
  dialogContent,
  error,
  fileInput,
  issueList,
  notification,
  overlay,
  overlayContent,
  secondaryAction,
} from './LoadQuestionSet.css';

export namespace LoadQuestionSet {
  export interface RenderProps {
    busy: boolean;
  }

  export interface Props {
    children(props: RenderProps): ReactNode;
    inputRef: RefObject<HTMLInputElement | null>;
    ready: boolean;
    unavailableMessage: string;
    onBusyChange(busy: boolean): void;
    onLoaded(): void;
  }
}

export function LoadQuestionSet({
  children,
  inputRef,
  ready,
  unavailableMessage,
  onBusyChange,
  onLoaded,
}: LoadQuestionSet.Props) {
  const actionError = useAtomValue(actionErrorAtom);
  const store = useStore();
  const startup = useAtomValue(startupAtom);
  const setIdentity = startup.status === 'ready'
    ? `${startup.set.contentHash}:${startup.set.loadedAt}`
    : null;
  const setActionError = useSetAtom(actionErrorAtom);
  const loadQuestionSet = useSetAtom(loadQuestionSetAtom);
  const [phase, setPhase] = useState<'idle' | 'reading' | 'confirming' | 'committing'>('idle');
  const [dragging, setDragging] = useState(false);
  const [confirmation, setConfirmation] = useState<parseQuestionSet.Result | null>(null);
  const [fileError, setFileError] = useState<QuestionSetParseError | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ identity: string; message: string } | null>(null);
  const dialogReference = useRef<HTMLDialogElement>(null);
  const cancelReference = useRef<HTMLButtonElement>(null);
  const restoreFocusReference = useRef<HTMLElement | null>(null);
  const operationReference = useRef(0);
  const dragDepthReference = useRef(0);
  const busyReference = useRef(false);
  const notificationReference = useRef<HTMLOutputElement>(null);
  const successTimerReference = useRef<{
    identity: string;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const busy = phase !== 'idle';

  const clearSuccessTimer = useCallback((identity?: string) => {
    const successTimer = successTimerReference.current;
    if (!successTimer || (identity && successTimer.identity !== identity)) {
      return;
    }
    clearTimeout(successTimer.timer);
    successTimerReference.current = null;
  }, []);

  const dismissSuccess = useCallback(() => {
    clearSuccessTimer();
    const notificationElement = notificationReference.current;
    if (notificationElement?.matches(':popover-open')) {
      notificationElement.hidePopover();
    }
    setSuccess(null);
  }, [clearSuccessTimer]);

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  useEffect(() => () => {
    operationReference.current += 1;
    busyReference.current = false;
    onBusyChange(false);
  }, [onBusyChange]);

  useEffect(() => () => {
    clearSuccessTimer();
  }, [clearSuccessTimer]);

  useEffect(() => {
    const dialogElement = dialogReference.current;
    if (!dialogElement) {
      return;
    }
    if (confirmation && !dialogElement.open) {
      dialogElement.showModal();
      cancelReference.current?.focus();
    }
    if (!confirmation && dialogElement.open) {
      dialogElement.close();
    }
  }, [confirmation]);

  const visibleSuccess = success?.identity === setIdentity ? success : null;

  useEffect(() => {
    const notificationElement = notificationReference.current;
    if (!visibleSuccess || !notificationElement) {
      return undefined;
    }

    notificationElement.showPopover();
    const notificationIdentity = visibleSuccess.identity;
    const timer = setTimeout(() => {
      if (successTimerReference.current?.identity === notificationIdentity) {
        successTimerReference.current = null;
      }
      setSuccess((currentSuccess) => (currentSuccess?.identity === notificationIdentity
        ? null
        : currentSuccess));
    }, 5000);
    successTimerReference.current = {
      identity: notificationIdentity,
      timer,
    };

    return () => {
      clearSuccessTimer(notificationIdentity);
      if (notificationElement.matches(':popover-open')) {
        notificationElement.hidePopover();
      }
    };
  }, [clearSuccessTimer, visibleSuccess]);

  const prepareFile = useCallback(async (file: File) => {
    if (!ready) {
      setDropError(unavailableMessage);
      return;
    }
    if (busyReference.current) {
      setDropError('A question set is already being prepared. Finish or cancel it before loading another file.');
      return;
    }

    const operation = operationReference.current + 1;
    operationReference.current = operation;
    busyReference.current = true;
    setPhase('reading');
    setDragging(false);
    setActionError(null);
    setFileError(null);
    setDropError(null);
    dismissSuccess();
    try {
      const parsed = await parseQuestionSet(await file.text(), file.name);
      if (operationReference.current !== operation) {
        return;
      }
      setConfirmation(parsed);
      setPhase('confirming');
    } catch (error_) {
      if (operationReference.current !== operation) {
        return;
      }
      if (error_ instanceof QuestionSetParseError) {
        setFileError(error_);
      } else {
        setDropError(error_ instanceof Error
          ? error_.message
          : 'The selected file could not be read.');
      }
      setPhase('idle');
      busyReference.current = false;
    }
  }, [dismissSuccess, ready, setActionError, unavailableMessage]);

  const closeConfirmation = useCallback(() => {
    if (phase === 'committing') {
      return;
    }
    operationReference.current += 1;
    busyReference.current = false;
    setConfirmation(null);
    setPhase('idle');
    requestAnimationFrame(() => { restoreFocusReference.current?.focus(); });
  }, [phase]);

  const confirmLoad = useCallback(async () => {
    if (!confirmation || phase === 'committing') {
      return;
    }
    const operation = operationReference.current;
    setPhase('committing');
    const loaded = await loadQuestionSet(confirmation);
    if (operationReference.current !== operation) {
      return;
    }
    if (!loaded) {
      setPhase('confirming');
      busyReference.current = true;
      return;
    }
    busyReference.current = false;
    dialogReference.current?.close();
    setConfirmation(null);
    setPhase('idle');
    const current = store.get(startupAtom);
    if (current.status === 'ready' && current.set.contentHash === confirmation.contentHash
      && current.set.name === confirmation.name) {
      setSuccess({
        identity: `${current.set.contentHash}:${current.set.loadedAt}`,
        message: `Loaded ${confirmation.name} with ${confirmation.questionCount} questions. `
          + 'Learning progress and practice runs were deleted.',
      });
    }
    onLoaded();
  }, [confirmation, loadQuestionSet, onLoaded, phase, store]);

  const handlePickerChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const [file] = [...input.files ?? []];
    input.value = '';
    if (!file) {
      return;
    }
    prepareFile(file);
  }, [prepareFile]);

  useEffect(() => {
    const eventTarget = globalThis;
    const hasFiles = (event: DragEvent) => [...event.dataTransfer?.types ?? []].includes('Files');
    const preventNavigation = (event: DragEvent) => {
      event.preventDefault();
      const transfer = event.dataTransfer;
      if (!transfer) {
        return;
      }
      transfer.dropEffect = hasFiles(event) && ready && !busyReference.current ? 'copy' : 'none';
    };
    const handleDragEnter = (event: DragEvent) => {
      preventNavigation(event);
      if (!hasFiles(event) || !ready || busyReference.current) {
        return;
      }
      dragDepthReference.current += 1;
      setDragging(true);
    };
    const handleDragLeave = (event: DragEvent) => {
      preventNavigation(event);
      if (!hasFiles(event)) {
        return;
      }
      dragDepthReference.current = Math.max(0, dragDepthReference.current - 1);
      if (dragDepthReference.current === 0) {
        setDragging(false);
      }
    };
    const handleDrop = (event: DragEvent) => {
      preventNavigation(event);
      dragDepthReference.current = 0;
      setDragging(false);
      if (!ready) {
        setDropError(unavailableMessage);
        return;
      }
      if (busyReference.current) {
        setDropError('A question set is already being prepared. Finish or cancel it before loading another file.');
        return;
      }
      const files = [...event.dataTransfer?.files ?? []];
      if (files.length === 0) {
        setDropError('Drop one JSON file to replace the current question set.');
        return;
      }
      if (files.length > 1) {
        setDropError('Drop only one JSON file at a time.');
        return;
      }
      prepareFile(files[0]!);
    };
    eventTarget.addEventListener('dragenter', handleDragEnter);
    eventTarget.addEventListener('dragover', preventNavigation);
    eventTarget.addEventListener('dragleave', handleDragLeave);
    eventTarget.addEventListener('drop', handleDrop);
    return () => {
      eventTarget.removeEventListener('dragenter', handleDragEnter);
      eventTarget.removeEventListener('dragover', preventNavigation);
      eventTarget.removeEventListener('dragleave', handleDragLeave);
      eventTarget.removeEventListener('drop', handleDrop);
    };
  }, [prepareFile, ready, unavailableMessage]);

  return (
    <>
      <input
        ref={inputRef}
        className={fileInput}
        accept=".json,application/json"
        aria-label="Load question set JSON file"
        type="file"
        tabIndex={-1}
        onChange={handlePickerChange}
        onClick={() => {
          restoreFocusReference.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        }}
      />
      {children({
        busy,
      })}
      {(fileError || dropError) && (
        <section className={error} role="alert" aria-label="Question set load error">
          <p>{fileError ? 'Question set validation failed.' : dropError}</p>
          {fileError && (
            <ul className={issueList}>
              {fileError.issues.slice(0, 20).map((issue) => (
                <li key={`${issue.location}:${issue.message}`}>
                  {issue.location}
                  :
                  {' '}
                  {issue.message}
                </li>
              ))}
              {fileError.issues.length > 20 && (
              <li>
                +
                {fileError.issues.length - 20}
                {' '}
                more
              </li>
              )}
            </ul>
          )}
        </section>
      )}
      {visibleSuccess && (
        <output
          ref={notificationReference}
          className={notification}
          popover="manual"
          aria-live="polite"
          onToggle={(event) => {
            if (event.newState !== 'closed') {
              return;
            }

            clearSuccessTimer(visibleSuccess.identity);
            setSuccess((currentSuccess) => (currentSuccess?.identity === visibleSuccess.identity
              ? null
              : currentSuccess));
          }}
        >
          {visibleSuccess.message}
        </output>
      )}
      {dragging && phase === 'idle' && (
        <output className={overlay} aria-live="polite">
          <span className={overlayContent}>
            <strong>Drop a question set JSON to replace the current set</strong>
            <span>
              Loading it deletes all saved learning progress and practice runs after confirmation.
            </span>
          </span>
        </output>
      )}
      {phase === 'reading' && (
        <output className={overlay} aria-busy="true">
          <span className={overlayContent}>
            <strong>Reading question set…</strong>
            <span>The file is being checked before anything is replaced.</span>
          </span>
        </output>
      )}
      <dialog
        ref={dialogReference}
        className={dialog}
        aria-labelledby="load-question-set-heading"
        onCancel={(event) => {
          event.preventDefault();
          closeConfirmation();
        }}
      >
        {confirmation && (
          <div className={dialogContent}>
            <h2 id="load-question-set-heading">Replace the current question set?</h2>
            <p>
              Load
              {' '}
              <strong>{confirmation.name}</strong>
              {' '}
              with
              {' '}
              {confirmation.questionCount}
              {' '}
              questions.
            </p>
            <p>All saved learning progress and every practice run will be deleted.</p>
            {actionError && <p className={error} role="alert">{actionError}</p>}
            <div className={dialogActions}>
              <button
                ref={cancelReference}
                className={secondaryAction}
                disabled={phase === 'committing'}
                type="button"
                onClick={closeConfirmation}
              >
                Cancel
              </button>
              <button
                className={action}
                disabled={phase === 'committing'}
                type="button"
                onClick={confirmLoad}
              >
                Replace question set
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

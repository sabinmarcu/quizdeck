import type { RefObject } from 'react';
import {
  button,
  dialog,
  dialogActions,
  dialogContent,
  empty,
  secondaryButton,
  shortcutHelp,
} from './Learning.css';

export namespace LearningDialogs {
  export interface Props {
    actionError: string | null;
    cancelResetRef: RefObject<HTMLButtonElement | null>;
    closeHelpDialog(): void;
    closeResetDialog(): void;
    confirmReset(): Promise<void>;
    helpCloseRef: RefObject<HTMLButtonElement | null>;
    helpDialogRef: RefObject<HTMLDialogElement | null>;
    pending: boolean;
    resetDialogRef: RefObject<HTMLDialogElement | null>;
  }
}

export function LearningDialogs({
  actionError,
  cancelResetRef,
  closeHelpDialog,
  closeResetDialog,
  confirmReset,
  helpCloseRef,
  helpDialogRef,
  pending,
  resetDialogRef,
}: LearningDialogs.Props) {
  return (
    <>
      <dialog
        ref={resetDialogRef}
        className={dialog}
        aria-labelledby="reset-learning-heading"
        onCancel={(event) => {
          event.preventDefault();
          closeResetDialog();
        }}
      >
        <div className={dialogContent}>
          <h2 id="reset-learning-heading">Reset all learning progress?</h2>
          <p>
            This permanently clears every saved learning answer in this local browser.
            It does not change practice runs, question data, or storage settings.
          </p>
          {actionError && <p className={empty} role="alert">{actionError}</p>}
          <div className={dialogActions}>
            <button
              ref={cancelResetRef}
              className={secondaryButton}
              disabled={pending}
              type="button"
              onClick={closeResetDialog}
            >
              Cancel
            </button>
            <button
              className={button}
              disabled={pending}
              type="button"
              onClick={async () => { await confirmReset(); }}
            >
              Reset learning progress
            </button>
          </div>
        </div>
      </dialog>
      <dialog
        ref={helpDialogRef}
        className={dialog}
        aria-labelledby="learning-help-heading"
        onCancel={(event) => {
          event.preventDefault();
          closeHelpDialog();
        }}
      >
        <div className={dialogContent}>
          <h2 id="learning-help-heading">Learning keyboard help</h2>
          <ul className={shortcutHelp}>
            <li>/ focuses search. Escape exits search without clearing it.</li>
            <li>j/k or arrows move questions or answer choices. gg/G use the first/last item.</li>
            <li>
              l opens a row. h/l or left/right browse questions; Escape returns to the list.
            </li>
            <li>
              Use a–d or 1–4 to select a choice. Every selection is accepted immediately: an
              incorrect choice ends the question, while correct choices accumulate until all are
              selected. Enter or Space on a focused choice selects it.
            </li>
            <li>Ctrl-d/u scrolls half a page. ? opens this help.</li>
          </ul>
          <div className={dialogActions}>
            <button
              ref={helpCloseRef}
              className={button}
              type="button"
              onClick={closeHelpDialog}
            >
              Close help
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

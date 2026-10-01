# Phase 2 — Learning mode

**Status:** implemented. **Dependency:**
[Phase 1 — Foundations and launch](01-foundations-and-launch.md).

[Vision](vision.md) · Next: [Phase 3 — Practice](03-practice-mode.md)

## Outcome and scope

Deliver the same complete learning workflow in Ink and React DOM: searchable
questions, recorded correct/incorrect completion, feedback after answering,
reopening saved progress, and a confirmed global reset. Learning is untimed.

Shared models/actions, both persistence implementations, and both renderers belong
in this phase. A web-only or CLI-only implementation does not satisfy its exit.

## Decision gate

This implementation uses the plan's conservative first-answer policy: retain the
recorded learning answer until the global reset. No re-answer controls or
per-question reset paths are added. If retries are selected later, revise this
phase and the vision to define whether status means the first or latest answer.

## Shared implementation

1. **Learning projection and search**
   - Derive `unanswered`, `correctly_answered`, or `incorrectly_answered` from the
     validated persisted answer record. Either answered outcome means completed.
   - Build search over source ID and description, case-insensitively; do not match
     explanations or treat an empty result as an empty bank.
   - Support All, Unanswered, Completed, Correctly answered, and Incorrectly
     answered filters. Derive completed/total counts separately from result counts.
   - Preserve query, filter, and focused row within the application session when
     moving between the list and detail. Do not persist duplicate derived lists.
2. **Answer and feedback transition**
   - Before answering, expose only description and actual choices. Do not expose
     correctness through text, styling, accessibility attributes, or explanations.
   - A click, focused-choice activation, or valid answer shortcut is the answer;
     focus movement and opening a question are not. There is no Submit/Mark
     complete step.
   - Validate the chosen index against the actual choices and compute its outcome
     using the bank. Atomically persist choice plus completion status with both
     adapters, then publish the committed Jotai record and reveal feedback.
   - Retain prior committed state on write failure; prevent duplicate pending
     activations. Do not expose unsaved feedback as if the answer were recorded.
   - Reveal selected choice, correct/incorrect status, correct choice, and answer
     justifications after commit. Represent absent source explanations honestly.
   - Reopening saved learning progress restores the choice/status/feedback. An
     unanswered question remains unanswered after viewing and reopening.
3. **Global reset**
   - Provide one Reset all learning progress action with explicit confirmation.
   - Clear all learning answer/status records in one transaction; only after
     commit update the projection and show all questions as unanswered.
   - Cancellation and failed transactions change nothing. Do not alter bank
     snapshots, practice records, timing, or completed reports.
   - Provide no per-question Reset/Unmark path, and no reset caused by reopening.
4. **Independence and timing**
   - Keep learning writes independent of practice records.
   - Create no learning clock, duration, timing checkpoints, or timing timestamps.
     Correctness is recorded completion, not an inferred mastery score.

## Equivalent renderer delivery

| Capability | Ink CLI | React DOM web |
| --- | --- | --- |
| Searchable list | Terminal search-entry context, status filters, focused row, source ID and text preview | Semantic search input, equivalent filters, keyboard/pointer-operable list |
| Completion display | Textual correct/incorrect/unanswered labels and aggregate counts | Same statuses/counts with accessible labels; not color-only |
| Question answering | Wrapping description/choices; `j/k` moves focus, Enter or answer shortcuts activate | Native operable choice controls; navigation/focus does not answer accidentally |
| Feedback | Selected/correct choice, outcome, readable justifications | The same information in theme-backed components |
| Reset | Named global action with confirmation and cancellation | Named global action with accessible confirmation and restored focus |
| Storage errors | Pending/save failure stays on the prior committed state | The same transaction-first behavior; no optimistic completion |

Implement `h/l`, arrows, `gg/G`, contextual scrolling/search/help, and return to
list according to the vision. Ignore answer shortcuts where text entry owns the
input. Handle question 140's three choices without a phantom fourth choice.

## Exclusions

No practice timing or run workflow, per-question reset, early answer reveal,
manual completion checkbox, practice-to-learning status updates, or new scoring
policy. Do not interpret this phase as approval of the learning re-answer default.

## Verification

- In the actual CLI and browser, find questions by ID and description, change
  filters, open/return, and observe query/focus preservation and honest empty state.
- Activate a correct answer and an incorrect answer. Both become completed with
  the appropriate persisted status only after commit, and reveal justifications.
- Exercise the three-choice question and missing explanations without altering
  bank content. Navigate focus without creating a completion record.
- Restart each application/store and reopen those questions. Observe restored
  choices, outcomes, feedback, filters/count semantics, and still-unanswered views.
- Cancel then confirm global reset. Verify isolation from real practice-shaped
  persisted records using a valid fixture, then reopen storage to confirm results.
- Exercise a failed answer transaction and failed reset; neither partial learning
  records nor false completion should appear in Jotai or after restarting.
- Use deterministic colocated Vitest coverage for search/status boundaries, answer
  activation/outcome, reset atomicity, and preservation of unrelated run records.
  Use isolated real-adapter exercises where transactional behavior is uncertain.
- Verify no learning timer or timing field is introduced. Run type/lint checks and
  record terminal/browser smoke evidence; remove throwaway storage/fixtures.

## Exit criteria

Both interfaces deliver every learning action and status using their real stores,
with no initial feedback leak, missing-source fabrication, or unsaved completion.
Progress survives reopening. Global reset is atomic, confirmed, and learning-only.
Keyboard and pointer/native controls work, long text remains readable, and learning
remains entirely untimed.

## Implementation and verification evidence

- `src/state/learning.ts` owns session query/filter/focus, derived counts and
  filtered rows, feedback-safe detail projections, transactional answer actions,
  and confirmed global reset. Storage rejects an already recorded learning answer.
- `src/cli/InkLearning.tsx` and `src/web/Learning*.tsx` deliver the same learning
  capability using native SQLite and IndexedDB respectively. The shells expose
  Learn without adding any practice workflow or learning timing.
- Real terminal and browser interaction covered correct/incorrect completion,
  focus without answering, search/filter context, read-only saved feedback, the
  three-choice question, missing explanations, and canceled/confirmed reset.
- Source and built Ink were exercised, including narrow wrapping, search text
  containing q/j/k, repeated opening, restart persistence, native SQLite answer
  and reset failures, visible errors, and successful retry after removing failure.
- Browser checks covered native IndexedDB answer persistence/reopening, stale-write
  and reset errors without false feedback or completion, retained failed-reset
  confirmation, saved practice-record preservation, modal focus restoration,
  keyboard help, empty search, and a 390-pixel layout without horizontal overflow.
- Review corrections were exercised in real interfaces: repeated shortcuts during
  an IndexedDB save produced no false error; a successful answer restored focus;
  empty searches could not open stale rows; and answering under Unanswered retained
  the same previous/next detail order in both renderers.
- Recorded completion survives source updates by stable ID. Answered detail and
  justifications use the record's immutable bank version, with an explicit
  historical-content notice, rather than relabeling an old choice as a new one.
- A native terminal Delete-key payload incorrectly activated choice A during smoke
  verification. Shared exact-single-key shortcut validation corrected it; the
  failing-before/passing-after terminal scenario and permanent regression coverage
  verify that special keys/pasted strings cannot answer a question.
- 44 colocated Vitest tests passed, including native SQLite answer/reset rollback,
  practice-record preservation, stable detail neighbors, and saved-bank feedback.
  Typecheck, ESLint fixing checks, and both builds passed. Managed AI instructions
  remain current.
- Runtime proof is Linux/Chromium; Windows and Safari runtime verification remains
  Phase 4. Existing ESLint peer-version and Vite large-chunk warnings remain.
- Status coloring was exercised in actual Ink ANSI output and the browser:
  correctly answered questions/correct choices green, incorrect outcomes/choices
  red, and unanswered content neutral. Web theme variants and feedback backgrounds
  maintain measured text contrast above 4.5:1 in light and dark modes.
- CLI detail layout was exercised at wide and narrow terminal sizes: extra space
  before answers, one footer hotkey summary, and a cyan inline `›` focus marker
  across wrapped choice text. Focus alone saved no answer; saved feedback retained
  green/red correctness without the removed focused-choice readout.
- Both renderers now expose Learn first and Overview/Storage/Help under Extras.
  Real keyboard/native-menu checks covered disclosure, focus-only movement, item
  activation, parent/back handling, contextual help, retained learning state,
  and a 390-pixel web layout without horizontal overflow.

# Phase 2 — Learning mode

**Status:** planned, not implemented. **Dependency:**
[Phase 1 — Foundations and launch](01-foundations-and-launch.md).

[Vision](vision.md) · Next: [Phase 3 — Practice](03-practice-mode.md)

## Outcome and scope

Deliver the same complete learning workflow in Ink and React DOM: searchable
questions, recorded correct/incorrect completion, feedback after answering,
reopening saved progress, and a confirmed global reset. Learning is untimed.

Shared models/actions, both persistence implementations, and both renderers belong
in this phase. A web-only or CLI-only implementation does not satisfy its exit.

## Decision gate

Vision section 2 still proposes retaining the recorded learning answer until the
global reset. Confirm that policy before implementing re-answer controls or a
record-update path. This plan assumes the first answer is retained. If retries
are chosen, update this phase and the vision to specify whether the recorded status
means the first or latest answer; do not invent a per-question reset.

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

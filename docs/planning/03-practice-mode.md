# Phase 3 — Practice mode

**Status:** planned, not implemented. **Dependencies:**
[Phase 1](01-foundations-and-launch.md) and [Phase 2](02-learning-mode.md).

[Vision](vision.md) · Next: [Phase 4 — Integration and delivery](04-integration-and-delivery.md)

## Outcome and scope

Deliver the complete practice capability in both Ink and React DOM: individually
persisted randomized runs, sequential answers, read-only earlier-question review,
active-time accumulation, pause/resume, history, and end-only results. These are
one scope: do not ship an answerable practice mode while postponing its timing,
resumption, or final report to another renderer/phase.

## Decision gates

Before implementing the affected interactions, confirm or revise the vision's
proposed defaults:

- Successful answer selection automatically opens the next unanswered question.
- Active practice time includes reading and earlier-question inspection; no idle
  cutoff or imposed time limit. Web hide/blur pauses; an open CLI session cannot
  reliably infer every desktop focus change.
- Reports show correct count/60 and percentage without a pass/fail threshold.
- Timing checkpoints are proposed at one-second intervals plus progress actions,
  pause, and completion. Hard-crash recovery uses the last durable checkpoint.

None of these gates changes the settled requirements: immediate answer recording,
immutable earlier answers, completion upon answering question 60, no early
correctness/justifications, and no learning time tracking.

## Shared implementation

1. **Run creation and bank identity**
   - Uniformly sample and order exactly 60 distinct source IDs from the entire
     valid bank, regardless of learning completion. Preserve answer order.
   - Persist run identity, bank-version reference, sample/order, initial position,
     and lifecycle state before exposing its first question.
   - Reject banks smaller than 60 rather than silently shortening the run. Do not
     require samples from different runs to be disjoint.
   - Resume and grade against the run's immutable bank snapshot, not changed
     current content. Reuse bank versions rather than copying a whole bank per run.
2. **Sequential answering and read-only navigation**
   - Keep the next unanswered position separate from the viewed position. Only
     the next unanswered question accepts an answer.
   - On intentional selection, validate the run state, ownership/revision, viewed
     question, and real choice index. Commit choice, hidden outcome, new frontier,
     viewed position, and accumulated-time checkpoint in one transaction.
   - Publish committed state before advancing. No drafts, Submit button, skipping,
     or mutable previous answers. Duplicate/pending activations must not overwrite
     a recorded answer or accidentally answer the next question.
   - Allow backward/forward inspection of answered questions and return to the
     frontier. Display recorded choice but not correctness, justifications, source
     ID, future sample, running score, or a partial report.
   - Use screen projections that omit withheld fields; do not leak correctness
     through colors, DOM/ARIA status, terminal markers, or an early report view.
     This remains a local study application, not a tamper-proof assessment.
3. **Timing and lifecycle**
   - Use one monotonic session clock and durable accumulated milliseconds. Calendar
     creation/completion times are metadata, not elapsed-duration arithmetic.
   - Count active reading/thinking and previous-answer inspection in an unfinished
     run. Stop for pause, leaving practice, completed reports, and between sessions.
   - Checkpoint on the agreed interval and immediately on actions/pause/completion.
     Serialize a run's answer, clock, and ownership mutations so stale snapshots
     cannot overwrite newer answers or add an interval twice.
   - Only begin a resumed interval after loading/validating the run and acquiring
     ownership. Enforce one active run per application instance and one active
     writer per run across processes/tabs.
   - Recover a crashed run from its last committed answers and time checkpoint,
     treating disconnected time as paused. Do not promise exact reconstruction of
     an uncheckpointed hard-crash tail or rely on unload callbacks alone.
   - Pausing/resuming preserves recorded outcomes, frontier, viewed position, and
     cumulative duration. Starting another run does not discard prior runs.
4. **Completion, history, and report**
   - Selecting answer 60 atomically commits the final answer, completed state,
     frozen duration, and result summary. Then open the full report, with no
     separate Finish action and no report on a failed completion transaction.
   - History exposes creation/date, lifecycle state, answered count, duration, and
     resume/review actions. Show scores only for completed runs.
   - Persist multiple unfinished/completed runs independently. Completed answers,
     timing, and results are immutable; no run deletion/reset/rename is added.
   - Report all 60 questions in practice order with position-to-source-ID mapping,
     recorded/correct choice, correct/incorrect status, and source justifications.
     Handle empty explanations and the three-choice item without invented content.
   - Derive full report detail from saved answers and the immutable bank snapshot;
     retain the committed completion/result summary. Reopening must reproduce the
     same report without rerandomization or regrading against another bank.
   - Do not update learning status. Learning reset does not alter any run/report.

## Equivalent renderer delivery

| Capability | Ink CLI | React DOM web |
| --- | --- | --- |
| Run list | Navigable new/resume/review actions and saved-run summaries | Equivalent keyboard/pointer-operable history and actions |
| Practice question | Practice position/60, wrapped content/choices, explicit choice focus and activation | Same visible fields, semantic choice controls, and selection semantics |
| Previous-answer review | `h/l` or arrows browse accessible positions; recorded choices are read-only | Same bounds and read-only choices without hidden-feedback leaks |
| Timing | Accumulated duration and terminal pause/exit/supported suspension lifecycle | Same accumulated duration with visibility/focus/navigation lifecycle |
| Pause/resume | Save/pause and return to history or quit; reopen restores run/view | Equivalent navigation/session recovery without trusting unload for all saves |
| Completion/report | Answer 60 opens a complete readable saved report | Same report, mapping, outcomes, explanations, and persisted result |
| Concurrent ownership | Another CLI process cannot take an actively owned run or overwrite answers | Another tab cannot take the active writer; commit notifications refresh projections |

All CLI and web work lands within this phase, using the same Jotai action contracts
and transition rules. Platform lifecycle handlers are adapters to those rules, not
independent implementations of practice behavior.

## Exclusions

No partial-run results, answer editing during earlier-question review, answering
future questions out of sequence, time limit, idle timeout, question-count setting,
answer shuffling, account/backend synchronization, or automatic learning completion
from practice. Do not add test-only randomization controls to the production CLI.

## Verification

- In each real interface/store, start a run and observe exactly 60 distinct saved
  IDs with stable order. Pause/reopen the same run and confirm no new sample.
- Answer several questions, inspect earlier recorded choices, try changing them,
  and return to the frontier. Confirm immutable answers, no skip, and no early
  source-ID/correctness/justification/report disclosure.
- Exercise duplicate/held activations, the three-choice item, missing explanations,
  and a failed answer transaction. Verify both stored records and visible state.
- Measure active intervals separated by a real pause/restart. With an injectable
  clock in deterministic tests, prove 8 + pause + 12 minutes equals 20, not wall
  time; also cover system-clock changes, lifecycle pauses, and checkpoint recovery.
- Run two real processes/tabs against one backend/run. Verify ownership conflict,
  stale-session recovery, no lost answers, and no duplicated elapsed interval.
- Complete a run through answer 60. Verify immediate saved completion/report and
  all position-to-source-ID mappings; restart and reopen the unchanged report.
- Create multiple runs; confirm isolated history and that learning reset leaves
  them and their results intact. Confirm learning never contributes timing.
- Keep behavior-focused, deterministic Vitest coverage for sampling boundaries,
  frontier/view separation, immutability, concealed feedback, atomic finalization,
  timing accumulation, and concurrency errors. Use actual adapters for durability
  guarantees; do not replace all persistence proof with mocks.
- Run type/lint checks, observe both actual renderers, and remove throwaway data.

## Exit criteria

A complete 60-question run can be started, interrupted, resumed, navigated for
read-only review, completed, and reopened with the same persisted report in both
applications. Timing excludes paused/learning/report periods, answer transactions
are durable and ownership-safe, and feedback stays concealed until completion.
Neither renderer nor a required lifecycle/report feature remains deferred.

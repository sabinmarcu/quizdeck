# Application vision

**Status: working product vision with linked implementation phases.** This is the
behavioral source of truth for both interfaces. Remaining proposed defaults are
identified in section 2; the phase plans carry those defaults explicitly rather
than silently treating them as approved. Creating these documents does not start
application implementation.

## 1. Scope and confirmed requirements

One certification-study application, with two equivalent interfaces:

- **CLI:** React rendered with Ink.
- **Web:** React DOM served/built with Vite; Vanilla Extract and
  `@sabinmarcu/theme` for styling.

Both interfaces must provide:

1. A learning mode with a searchable list of the entire question bank. Answering
   completes a question with either correctly answered or incorrectly answered
   status; opening it alone does not complete it.
2. A practice mode containing a randomized selection of exactly 60 questions,
   answered sequentially. Previous answers can be inspected but never edited.
3. A report only after the practice run finishes, including the mapping between
   practice position and original question ID.
4. Persisted learning answers and correctness status, with one global reset and
   no individual reset. Learning has no time tracking.
5. Individually persisted practice runs that can be started, interrupted,
   resumed, completed, and subsequently reviewed.
6. Cumulative practice timing across active sessions, excluding paused sessions.
7. Vim-like navigation in both interfaces.
8. Unanswered questions initially show only their description and choices.
   Learning reveals correctness and justifications after an answer is selected;
   practice hides them until the last question is answered and the run completes.

The source of question content is `src/questions.json`. Inspection found 175
unique question IDs and exactly one correct answer per question. Question 140 has
three choices rather than four; questions 3 and 57 have missing explanations for
some choices. Preserve source wording, answer ordering, and these exceptions.

## 2. Proposed defaults requiring review

These defaults are proposals, not additional confirmed requirements.

| Topic | Proposed default | Consequence / alternative |
| --- | --- | --- |
| Learning re-answering | Retain the recorded answer until the global reset | Whether a completed learning question permits another answer remains to be decided. If retries are allowed, define whether status means the first or latest answer; neither choice adds an individual reset. |
| Practice advancement | Recording an answer automatically opens the next unanswered question | Answer selection commits immediately; there is no separate submission step. Earlier answered questions remain available for read-only inspection. |
| Timing | Count active practice-screen time, including reading; no inactivity timeout or time limit | This measures active-session duration, not keystroke-only time. An idle cutoff could incorrectly exclude time spent reading. |
| Practice scoring | Report correct count out of 60 and percentage; no pass/fail threshold | A certification passing threshold has not been specified. |

The phase plans use the remaining proposed defaults as planning assumptions.
Confirm or revise each assumption before implementing its affected behavior.
Answer-driven learning completion, delayed feedback, read-only practice review,
and the absence of learning timing are confirmed requirements.
Storage media, platform-specific CLI locations, and Jotai-backed application state
are agreed decisions specified in sections 6 and 9. CLI and web share behavior,
not persisted progress: their local databases remain separate.

## 3. Navigation and information architecture

The home screen exposes **Learn** and **Practice**.

- Learn opens the question list, then a question-detail view.
- Practice opens a run list with **Start new run**, resumable runs, and completed
  runs. Starting a run opens its first question; resuming opens its saved current
  question; opening a completed run opens its report.
- Leaving an unfinished practice run pauses it; it does not complete or discard
  it. Starting another run does not replace existing runs.
- The CLI and web may use different layouts, but must expose the same actions,
  progress states, and report information.

### CLI command surface and web launch

Use [Clipanion](https://mael.dev/clipanion/docs/paths/) for command routing, help,
argument validation, and exit behavior. Register the interactive command as
`Command.Default`: invoking the CLI without a subcommand launches the Ink
interface. A separate `web` command launches the web application without starting
Ink. Do not maintain a parallel handwritten argument parser.

Planned invocations using the existing repository script names:

| Invocation | Behavior after implementation |
| --- | --- |
| `yarn cli` / `yarn start:cli` | Launch the interactive Ink interface |
| `yarn cli web` / `yarn start:cli web` | Start the web application's local HTTP host and print its URL |
| `yarn cli --help` / `yarn cli web --help` | Show Clipanion command help without launching either interface |

- The web command serves the Vite-built application bundled with the application
  distribution. Resolve assets relative to the installed application, not the
  current working directory. Missing assets produce an actionable build/install
  error; do not silently substitute a development server or a different UI.
- Default to `http://127.0.0.1:4173` and keep that origin stable so browser progress
  is retained between launches. If the port is occupied, explain the conflict;
  do not silently select another port and appear to lose IndexedDB progress.
- Run the web host in the foreground, print the browser URL, and shut it down
  cleanly on interruption. Automatic browser opening or a detached background
  daemon is not required. The existing Vite development script continues to own
  development/HMR; the user-facing web command is not a Vite development wrapper.
- Serve only the built web assets; do not expose the SQLite database, source tree,
  or filesystem traversal through the local host.
- A browser launched against this host still uses IndexedDB. The web command does
  not turn SQLite into a web backend, copy CLI progress, start a CLI practice
  timer, or synchronize the two stores.


## 4. Learning mode

### Question list

- Include all questions, initially ordered by original question ID.
- Show original ID, a question-text preview, and a textual progress indicator.
- Search by original ID or question-description text, case-insensitively. Avoid
  matching hidden explanation text to keep search results understandable.
- Support status filters: **All**, **Unanswered**, **Completed**, **Correctly
  answered**, **Incorrectly answered**. Completed includes both answer outcomes.
- Show completed/total progress separately from the filtered result count.
- Empty search results must not look like an empty question bank.
- Opening and returning from a question preserves the current query, filter,
  and focused list row for the current session.

### Question detail and completion

Completion is represented by the answer outcome, not a separate manual action:

| Status | Meaning | Transition |
| --- | --- | --- |
| `unanswered` | No answer has been recorded | Opening or reading leaves it unanswered |
| `correctly_answered` | The recorded choice is correct; the question is completed | Set when that answer is durably recorded |
| `incorrectly_answered` | The recorded choice is incorrect; the question is completed | Set when that answer is durably recorded |

- Initially display the description and actual choices only. Do not disclose
  correctness, a correct-choice indicator, or justifications before answering.
- An intentional choice activation records the answer and its correct/incorrect
  status together. No **Mark complete** or separate **Submit answer** action exists.
- Once the save succeeds, show the selected choice, the answer outcome, correct
  choice, and justifications for the available answers. Missing justification
  text is identified as missing from the source; it is not invented.
- Both correct and incorrect answers count as completed. Completion does not
  imply mastery or require a correct practice answer.
- Reopening an answered learning question restores its recorded choice, status,
  and revealed justifications. Opening an unanswered question does not change
  progress or expose feedback.
- Practice activity never changes learning status, and learning reset never
  changes practice history.
- There is no per-question **Reset**, **Unmark**, or implicit reopening reset.
- Learning stores the answer and status only: no elapsed time, active-session
  clock, reading-duration measurement, or learning timing timestamps.
- Re-answering an already completed learning question is a remaining review
  decision in section 2; it does not affect the confirmed completion/feedback rule.

### Global reset

**Reset all learning progress** requires explicit confirmation describing the
scope. One atomic operation returns every learning question to `unanswered`
and clears its recorded learning answer and correctness status. It leaves the
bank and all practice runs, answers, timings, and reports untouched.
Cancellation changes nothing.

## 5. Practice mode

### Creating a run

- Sample 60 distinct original question IDs uniformly without replacement from
  the full bank, independent of learning completion.
- Randomize their order. Different runs may legitimately overlap or even happen
  to produce the same sample; uniqueness between runs is not a requirement.
- Persist the run identity, bank version, and ordered selection before displaying
  its first question. Never redraw the sample when resuming.
- Preserve the source answer order; answer shuffling is not in scope.
- If a future bank contains fewer than 60 valid questions, do not silently reduce
  the run length. Explain that a practice run cannot be started.

### Answering sequentially and inspecting previous answers

- Show **Practice question N of 60**, the description, and actual choices. As in
  learning, unanswered questions initially expose no correctness or justifications.
- An intentional answer selection immediately records the chosen answer and its
  correct/incorrect outcome. Do not display that outcome, correct-choice
  indicators, justifications, original IDs, running score, or links to learning
  detail while the run is unfinished.
- There is no draft-answer or separate submission step. After the answer commits,
  the proposed navigation default opens the next unanswered question.
- Answers must be given in sequence: only the next unanswered question accepts
  an answer. Do not allow skipping or access to later unanswered questions.
- The user can navigate back through earlier answered questions and forward again
  to the next unanswered question. Earlier questions show their description,
  choices, and recorded user selection, but remain read-only and disclose no
  correctness status or justifications.
- Keep the viewed position separate from the next unanswered position. Inspecting
  question 4 when questions 1-10 are answered must not allow changing answer 4,
  answering question 12, or losing the next unanswered question 11.
- Read-only review reveals already visited questions, not the full future sample
  or the mapping to dataset IDs. The full report remains end-only.
- Recording the answer to question 60 completes the run and opens its report in
  the same operation. There is no separate **Finish run** action or partial report.
- Moving focus among choices is not answering. Click, explicit keyboard
  activation, or an answer shortcut gives an answer; navigation alone does not.
- Repeated activation of the same answered question cannot overwrite its answer
  or accidentally answer/skip the following question.

This is a local study tool, not a tamper-proof assessment. Hiding feedback in the
interface does not make the answer key inaccessible in the browser bundle or
local storage.

### Run lifecycle and history

Conceptual states: **active**, **paused**, **completed**. A new run becomes active
when its first question is displayed.

- Pausing preserves the ordered selection, recorded answers and outcomes, next
  unanswered position, viewed position, and elapsed active time. Resuming while
  inspecting an earlier question restores that read-only view and provides a
  clear way to return to the next unanswered question.
- Closing the CLI, leaving the practice screen, or ending the web session leaves
  a resumable run. Reopening does not create another run.
- Multiple unfinished runs are allowed. Only one run can be actively timed in an
  application instance at a time.
- A completed run's selection, answers, timing, and result are immutable. It can
  be reviewed but not resumed or reset.
- The history list shows run identity/date, status, answered count out of 60, and
  elapsed active time. Score appears only for completed runs.
- Run deletion, renaming, and practice-history reset are not requested and are
  not proposed.

### End-of-run report

Persist completion and its reportable outcome together before presenting success.
The report remains available after restarting the application and contains:

- Correct count out of 60 and percentage, completion date, and total active time.
- Every question in the original practice order.
- **Practice position -> original question ID**, for example
  **Practice question 1 -> dataset question 5**.
- The question text, recorded choice, correct choice, correctly/incorrectly
  answered status, and source justifications for each question, including explicit
  missing-justification notices where applicable.

Do not sort the primary report by dataset ID: the practice-position mapping must
remain obvious. A paused run exposes resume/progress information, not this report.

## 6. Persistence and storage

### Storage decisions

| Interface | Medium | Location / ownership |
| --- | --- | --- |
| CLI (Linux / Unix) | SQLite | `$XDG_DATA_HOME/claude-certification/progress.sqlite` when `XDG_DATA_HOME` is an absolute path; otherwise `~/.local/share/claude-certification/progress.sqlite` |
| CLI (Windows) | SQLite | `%LOCALAPPDATA%\claude-certification\progress.sqlite`; if `LOCALAPPDATA` is unavailable or invalid, use `AppData\Local\claude-certification\progress.sqlite` under the user's home directory |
| Web | IndexedDB | Database `claude-certification`, scoped to the browser profile and application origin |

SQLite gives the CLI atomic updates and durable per-run records without a database
server. The location is independent of the checkout or working directory and is
outside source control. Native SQLite support in the pinned Node runtime is the
preferred implementation route, subject to API verification during implementation.

On Windows, the usual resolved path is
`C:\Users\<user>\AppData\Local\claude-certification\progress.sqlite`. Resolve
paths with platform-native path handling. Keep the database in local application
data, not roaming `%APPDATA%`, Documents, the checkout, or a cloud-synced folder.
Any SQLite journal/WAL sidecar files stay alongside the database. The database
location does not depend on where the CLI executable is installed.

IndexedDB provides transactional browser-local records without introducing a
backend. Keep a stable deployed origin: another host or port has a different
store. Do not treat `localStorage`, a React state atom, or a component-unmount
handler as the durable source of truth.

### Logical records

This is a conceptual data contract, not a database schema or TypeScript API.

- **Question bank version:** a content identifier plus an immutable bank snapshot.
  Store a given version once and reference it from runs, rather than duplicating
  complete question content for each run.
- **Learning progress:** original question ID, recorded answer, and completion
  status (`correctly_answered` or `incorrectly_answered`); no record means
  `unanswered`. The current bank is the source of learning content. No learning
  time-tracking fields are stored.
- **Practice run:** unique run ID, bank-version reference, creation/completion
  times, lifecycle state, ordered list of 60 IDs, recorded answers and their
  correct/incorrect outcomes, next unanswered position, viewed position,
  accumulated active milliseconds, and a completed-result summary once finished.
- **Active timing ownership/checkpoint:** enough durable state to identify the
  writer, recover an interrupted run, and avoid counting two sessions concurrently.
- **Storage version:** supports deliberate, non-destructive schema migrations.

Historical runs use their original bank snapshot for resumption and grading,
including answer ordering. A bank update must not reinterpret earlier answers or
rewrite completed results. Learning completion remains keyed to stable source IDs;
content changes do not silently unmark individual questions. Any future source-ID
reassignment needs an explicit migration rather than a positional guess.

### Durability contract

- Persist each user-visible progress mutation at the action that causes it, not
  only at session end. This includes the learning answer/status, practice
  answer/outcome, practice view position, pause/resume, and completion.
- Confirm completion or advance to the next question only after its transaction
  commits. Storage failure leaves the prior committed state intact and explains
  why the action could not be saved; no silent in-memory-only fallback.
- Learning answer selection commits its choice and completion status atomically
  before revealing feedback. Practice answer selection commits its choice,
  hidden outcome, next/viewed positions, and timing checkpoint atomically.
  Answering question 60 additionally commits the completed state/result.
- Global learning reset is atomic and isolated from practice records.
- Validate the bank and persisted records at their boundaries using Zod. Invalid
  data or a failed migration must not trigger an automatic reset of user progress.
- Prevent simultaneous writers to the same run, including two CLI processes or
  browser tabs. A second opener must not overwrite a newer answer or double-count
  time. Recover stale ownership after a crashed session without advancing progress.

### Browser durability limit

Request persistent browser storage and expose whether it was granted. If storage
is unavailable, do not begin an apparently persistable session. If it works but
persistent retention is denied, disclose that limitation before progress begins.

Browser-local storage cannot guarantee survival of user-cleared site data,
private-browsing teardown, device loss, or every browser eviction policy. SQLite
also cannot survive deletion or disk loss. **Persist every interaction** means
transactional saves under available storage, not a guarantee against destruction
of the storage itself. If the intended requirement includes cross-device recovery
or guaranteed retention beyond browser-local storage, revise the proposed storage
architecture before approving this plan.

## 7. Practice timing

Elapsed time is the sum of active practice intervals, not
`completedAt - createdAt`. Calendar timestamps are history metadata, not the clock
used to measure a live interval.

Learning has no time tracking: no learning timer, duration, active-time
accumulation, or timing records. All timing rules below apply only to practice.

- Start timing when the practice question becomes available for interaction.
- Include reading and thinking while the run is active. Do not depend on keypress
  count or an arbitrary inactivity cutoff.
- Inspecting previously answered questions in an unfinished practice run counts
  as active practice time. Reviewing a completed report does not.
- Stop timing when the run is paused, the practice screen is left, or the run is
  completed. History, reports, learning, and time between sessions do not count.
- Resuming opens a new active interval and adds it to the already saved duration.
- Web: hide/blur of the practice page pauses timing; restoring visibility/focus
  resumes it only when that run's practice view is active and owns the writer.
- CLI: explicit pause/navigation away, process exit, and supported terminal
  suspension stop timing. A live terminal cannot reliably detect every desktop
  focus change; reading time in an open CLI session continues to count.
- Use a monotonic clock within each session, so changing the system clock does not
  change active duration.
- Proposed timing checkpoint interval: one second, plus immediate checkpoints on
  progress actions, pause, and completion. Display whole seconds, store milliseconds.
- Graceful shutdown saves the final interval. After a hard crash, recover from the
  last durable checkpoint and do not add the disconnected period. The final
  uncheckpointed tail can be lost; exact crash-time reconstruction is not promised.
- Browser unload callbacks are best effort, not the persistence strategy. Regular
  checkpoints and action transactions must already have saved useful state.

Example: 8 active minutes, a 2-hour break, and 12 more active minutes produces a
20-minute report, not a 2-hour-20-minute report.

## 8. Vim-like interaction and accessibility

Use shared action names and contextual keyboard semantics, not duplicated business
logic. The web must remain usable with native focus navigation and pointer/touch;
the CLI must remain usable with arrows and Enter. Vim motions are an additional
first-class interaction path, not a requirement to know Vim.

| Key | List views | Question/detail views |
| --- | --- | --- |
| `j` / `k`, down / up | Move the focused row | Move among choices/actions; scroll long learning content in its reading context |
| `gg` / `G` | First / last visible row | First / last item in the current context; never jump practice questions |
| `Ctrl-d` / `Ctrl-u` | Half-page movement | Half-page scrolling of long content |
| Enter | Open the focused row | Activate a focused choice to record an answer, or activate a named control; focus movement alone never answers |
| `h` / `l`, left / right | Back/open as appropriate | In practice, inspect the previous/next accessible question without changing answers or skipping unanswered questions; in learning, navigate between questions |
| Escape | Back/close the current overlay | Return from learning detail; from practice, pause and return to the run list |
| `/` | Focus search where available | Search is not available within an unfinished practice run |
| `a`-`d`, `1`-`4` | No answer action | Record an existing choice on an answerable question in either mode; never alter an earlier practice answer or address a nonexistent fourth choice |
| `?` | Open contextual shortcut help | Open contextual shortcut help |
| `q` / `Ctrl-c` (CLI) | Save and exit | Save, pause an unfinished run, and exit; do not bind browser quit shortcuts |

- Search entry is an input context: ordinary letters and Vim motions type text
  rather than navigating the list. Escape exits search editing; a separate visible
  control clears the query.
- Ignore global character shortcuts while editing any native text input or during
  text composition. Do not intercept browser/platform shortcuts indiscriminately.
- Keep list focus, choice focus, recorded answer, scroll context, and text-input
  focus distinct. Show the active context and available actions. Choice focus is
  not a provisional answer and does not require a separate submission action.
- Support long descriptions/explanations without requiring a wide terminal or
  producing inaccessible horizontal overflow on a narrow web viewport.
- Visible focus, semantic labels, screen-reader-compatible status text, and
  non-color-only correctness/completion indicators are required.
- Global reset is exposed as a named action with confirmation, not an easy-to-hit
  single-character destructive shortcut.
- CLI quit is a graceful save/pause/exit action. Web Escape returns within the app;
  it does not attempt to close a browser tab.

## 9. Shared architecture boundaries

- Keep question identities, learning transitions, random sampling, practice
  sequencing, report construction, timing rules, and input-action semantics shared.
- Keep DOM, Ink layout, browser lifecycle, terminal lifecycle, SQLite, and
  IndexedDB APIs in their owning renderer/platform adapters.
- Use identical transition rules against both storage adapters. Shared models must
  not import Node-only or DOM-only APIs.
- Use Jotai for shared application state in both React DOM and Ink. Reuse the
  shared state/action structure with an IndexedDB adapter for web and a SQLite
  adapter for CLI; inject the adapter rather than importing platform APIs into
  shared atoms. Each application instance owns its own Jotai store.
- Keep component-local hooks for local UI state and Context for one subtree owner.
  Persisted storage remains authoritative; atoms are its reactive projection,
  not a second durable database or a synchronization bridge between CLI and web.
- Prefer focused modules named for questions, learning, practice, history, state,
  data, and hooks. Do not introduce generic service/manager layers or fix a public
  file layout before the product choices are finalized.

### State ownership

| State category | Examples | Ownership |
| --- | --- | --- |
| Persisted records | Learning answers/statuses, practice runs and recorded answers, next/viewed positions, practice timing checkpoints and completed results | IndexedDB or SQLite is authoritative; Jotai exposes the loaded, committed records |
| Derived state | Filtered question lists, completion counts, current question, completed-run report | Derived Jotai atoms; do not separately persist or synchronize duplicate calculated values |
| Temporary UI state | Focused row/choice, search input, open help panel, pending-save and error indicators | Component hooks where local; Jotai where shared across components/features |

Expose focused hooks around nontrivial atom groups so renderers depend on actions
and meaning rather than database details. Practice correctness may be recorded
internally before completion, but UI projections must keep it and justifications
hidden until the run completes. Learning has no timing atoms or persisted timing
fields. A live practice-time display can advance between durable checkpoints;
that display is not a replacement for persisted accumulated time.

### Transaction-aware write path

The agreed mutation flow is:

1. An intentional user action invokes a shared action through a Jotai write atom.
2. Shared answer/transition logic determines the intended mutation; the UI may
   show a pending-save indicator without changing acknowledged progress.
3. The owning persistence operation validates current records and write ownership
   and commits all coupled fields in one database transaction.
4. Wait for transaction completion, not merely an individual IndexedDB request's
   success. SQLite operations likewise return success only after commit.
5. Publish the committed records into Jotai. Derived atoms update the question,
   completion counts, history, and report eligibility from those records.
6. Only then reveal learning feedback, advance practice, or display completion.

The coupled fields are those specified in section 6: learning answer plus status;
practice answer/outcome plus next/viewed positions and timing checkpoint; and, for
question 60, completed state and results. Global learning reset also uses one
transaction and publishes its cleared projection only after commit.

If saving fails, clear the pending indicator, expose the error, and retain the
previous committed projection. Do not reveal unsaved feedback, advance, or silently
fall back to in-memory progress. Prevent overlapping answer activations while the
same action is pending; per-run persistence operations must not overwrite newer
committed state.

Jotai's atomic state model does not make separate database writes transactional.
Do not persist each related field independently through `atomWithStorage` and
assume the run remains consistent. That utility supports a custom asynchronous
IndexedDB adapter and can be used for independent preferences where one value is
one complete update; core progress uses transaction-aware write atoms backed by
focused persistence operations. See [Jotai storage documentation](https://jotai.org/docs/utilities/storage).

### Startup and multiple sessions

- Open storage, apply required migrations, and validate/load persisted records
  before enabling answering. Expose loading/error state rather than briefly
  presenting initial empty progress as the user's actual progress.
- Do not start a resumed practice timer until its persisted run is loaded and the
  application has acquired active-run ownership. Hydration does not answer a
  question or manufacture a new practice run.
- Browser tabs use explicit post-commit notifications, such as `BroadcastChannel`,
  to invalidate/reload affected records in their Jotai projections. Do not assume
  Jotai or IndexedDB automatically synchronizes atom values across tabs.
- Notifications are not locks. Database-level ownership and conflict checks still
  prevent two writers from changing the same run or counting the same active
  interval twice. Apply stale-session recovery without altering recorded answers.
- Shared Jotai logic does not synchronize the web database with the CLI database;
  that separate local-store boundary is unchanged.


## 10. Web theme and local package references

Use `@sabinmarcu/theme` rather than recreating its tokens or introducing
`@sabinmarcu/website-theme` (which is website-specific).

- Author colocated component styles with Vanilla Extract.
- Use theme contracts for colors, spacing, and other available reusable values;
  add only genuinely application-owned extensions.
- Initialize and emit theme values before the UI needs them. Importing token
  references alone does not assign CSS variables.
- Keep completion, focus, selection, and correctness styles semantic and include
  text/shape differences, not only color differences.
- Use intrinsic responsive layout and container queries only for meaningful
  component-layout thresholds; do not use viewport media queries for layout.

Local source references supplied by the user:

- `~/Projects/omnirepo/workspaces/design-system/theme/` — current package/source.
- `src/theme.ts`, `src/contracts/theme.ts`, `src/runtime.ts` under that package —
  inspected token, setup, and runtime entry points.
- `~/Projects/omnirepo/.github/instructions/styling.instructions.md` — local styling
  conventions, including shared-theme versus website-theme ownership.
- The theme package's `REFACTOR_PLAN.md` describes a proposed theme-core/family
  split. It is a future design, not an already available API or a prerequisite for
  this application. Re-check its implementation status when implementation begins.

The application currently pins published theme 1.2.4. Use the local repository as
reference, not as a machine-specific production dependency. Do not alter local
scoped packages, copy their internals, or assume proposed refactor exports exist as
part of this planning task.

## 11. Application acceptance scenarios

These are product outcomes, not implementation phases or tests added now.

| Scenario | Expected outcome in both interfaces |
| --- | --- |
| Find a question | Search and status filtering reach any bank question and expose its completion status. |
| Learning feedback | Before answering, show only description and choices. Selecting an answer persists its correctly/incorrectly answered completion status and reveals justifications. Both outcomes count as completed. |
| Reopen learning | Restore the recorded choice, correctness status, and revealed justifications. Opening without answering remains unanswered. |
| Reset learning | Confirmation clears all learning progress at once; cancellation clears nothing; practice history survives. |
| Start practice | Exactly 60 distinct bank IDs are selected in a persisted randomized order before answering begins. |
| Respect source exceptions | The three-choice question has three selectable choices; missing explanations are reported honestly. |
| Answer sequentially | Activating a choice records it immediately and advances exactly once; focus movement does not answer and unanswered questions cannot be skipped. |
| Inspect earlier practice answers | Move backward/forward through answered questions and see recorded selections without being able to alter them; status and justifications remain hidden until completion. |
| Hide early feedback | No original-ID mapping, correctness, explanation, running score, or partial report is shown in an unfinished run. |
| Resume an interrupted run | The same run ID, sample/order, recorded answers/outcomes, next unanswered position, viewed position, and saved practice time return. |
| Keep runs independent | Starting or completing one run does not replace another; learning progress is independent of both. |
| Accumulate time | 8 minutes + pause + 12 minutes yields 20 active minutes; neither a long break nor report viewing increases it. |
| Keep learning untimed | Reading, answering, and revisiting learning questions creates no learning timers, durations, or timing records and does not add to practice time. |
| Finish and review | Selecting the answer to question 60 commits completion and a persisted report immediately, including every question's status, justifications, and position-to-source-ID mapping; no separate finish action is needed. |
| Recover storage failures | Failed writes do not acknowledge unsaved progress or advance the run; recovery does not silently reset data. |
| Avoid concurrent corruption | A second process/tab cannot overwrite the same run or count the same active interval twice. |
| Resolve CLI storage | On Windows, use local application data with the documented home-directory fallback; on Linux/Unix, use the XDG/home fallback. Executable location and working directory do not change the database path. |
| Publish committed state | Jotai reflects persisted records after the whole transaction commits; a failed write leaves answers, completion counts, navigation, and report eligibility at their prior committed values. |
| Hydrate before interaction | Load and validate persisted progress before enabling answers or starting a resumed practice timer; no initial empty-state overwrite occurs. |
| Refresh another web tab | Post-commit notifications refresh affected atom projections without granting another writer ownership or double-counting practice time. |
| Use the keyboard | Learning, answering, pausing/resuming, history, and reporting are operable with the documented Vim-like contexts and standard controls. |
| Use the web theme | Theme-backed styles are initialized, responsive, and accessible without depending on unpublished refactor APIs. |
| Launch the default CLI | With no subcommand, Clipanion dispatches to Ink; help and invalid-command handling do not accidentally start an interactive session. |
| Launch web from the CLI | The separate `web` command serves the built React application at the stable local origin without rendering Ink or opening the CLI progress database; missing assets and occupied ports produce actionable errors. |
| Stop the web host | Interrupting the foreground web command releases the listener cleanly; a later launch uses the same origin and restores browser-local progress. |

## 12. Phased implementation plan

Execute phases in the order below. Each phase is separated by capability/scope,
not by renderer: the same applicable behavior must be delivered for Ink and React
DOM within that phase. Platform-specific mechanics, such as the CLI dispatcher,
SQLite paths, browser storage, or lifecycle events, belong alongside their shared
capability, not in a separate later CLI-only or web-only delivery track.

| Phase | Scope | Dependencies | Plan |
| --- | --- | --- | --- |
| 1 | Shared data, transactional persistence/Jotai state, application shells, and Clipanion launch commands | None | [Foundations and launch](01-foundations-and-launch.md) |
| 2 | Searchable learning, answer-driven completion/feedback, and global reset | Phase 1 | [Learning mode](02-learning-mode.md) |
| 3 | Complete practice lifecycle: randomized runs, sequential answers/read-only review, timing, history, and end-only reports | Phases 1-2 | [Practice mode](03-practice-mode.md) |
| 4 | Cross-platform/browser integration, durable recovery, accessibility/parity, and distributable application verification | Phases 1-3 | [Integration and delivery](04-integration-and-delivery.md) |

Each phase file defines its shared work, CLI and web delivery, exclusions,
behavioral verification, and exit criteria. A phase is not complete merely because
one renderer works or shared functions compile. Real storage and runtime smoke
proof are required for the affected surfaces; implementation must not hide missing
capabilities behind mocks, disabled controls, or in-memory persistence substitutes.

### Review and implementation boundary

Learning re-answering, automatic practice advancement, practice scoring, and the
precise definition of active practice time remain proposed defaults in section 2.
The phase files identify the affected decision gates; requesting phase documents
does not silently finalize those defaults. Revise this vision and the relevant
phase together when a decision changes.

Storage locations/media, shared Jotai state with transactional persistence,
completion, feedback, read-only practice review, untimed learning, and Clipanion's
default Ink/separate web launch behavior are settled requirements. The documents
describe future work; no application code or dependencies are changed by creating
or moving this planning set.

This vision governs behavior. Phase documents govern execution order and scope.
If they conflict, resolve the discrepancy before implementing the affected phase.


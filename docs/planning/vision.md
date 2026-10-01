# Quizdeck vision

**Status: working product vision with linked implementation phases.** This is the
behavioral source of truth for both interfaces. Remaining proposed defaults are
identified in section 2; the phase plans carry those defaults explicitly rather
than silently treating them as approved. Phase 1 is implemented; question-set
loading and distribution remain planned in Phases 2 and 3.

## 1. Scope and confirmed requirements

**Quizdeck** is a generic multiple-choice study application. It ships no subject
content of its own: both interfaces start with a small bundled demo set and study
whatever question set the user loads. The product name is **Quizdeck** and its
machine identifier (package, CLI binary, storage names) is `quizdeck`. No other
product or vendor branding appears in tracked files; the repository folder name
is the only exception.

Quizdeck has two equivalent interfaces:

- **CLI:** React rendered with Ink.
- **Web:** React DOM served/built with Vite; Vanilla Extract and
  `@sabinmarcu/theme` for styling.

Both interfaces must provide:

1. **Question-set loading.** The CLI loads a JSON file with
   `yarn cli load path/to/questions.json`; the web application loads one by
   drag-and-drop (with a keyboard-accessible file picker as the equivalent
   control). Loading replaces the current set and resets all other data.
2. **A bundled demo set** of three generic questions, used until the first load.
3. A learning mode with a searchable list of the entire current set. Answering
   completes a question with either correctly answered or incorrectly answered
   status; opening it alone does not complete it.
4. A practice mode containing a randomized selection of
   `min(60, question count)` questions, answered sequentially. Previous answers
   can be inspected but never edited.
5. A report only after the practice run finishes, including the mapping between
   practice position and original question ID.
6. Persisted learning answers and correctness status, with one global reset and
   no individual reset. Learning has no time tracking.
7. Individually persisted practice runs that can be started, interrupted,
   resumed, completed, and subsequently reviewed.
8. Cumulative practice timing across active sessions, excluding paused sessions.
9. Vim-like navigation in both interfaces.
10. Unanswered questions initially show only their description and choices.
    Learning reveals correctness and justifications after an answer is selected;
    practice hides them until the last question is answered and the run completes.

Question content is user data, not application source. The repository's former
`src/questions.json` is relocated to a gitignored local directory and loaded like
any other set; the build no longer imports or bundles it.

## 2. Proposed defaults requiring review

These defaults are proposals, not additional confirmed requirements.

| Topic | Proposed default | Consequence / alternative |
| --- | --- | --- |
| Learning re-answering | Retain the recorded answer until the global reset or a set load | Whether a completed learning question permits another answer remains to be decided. If retries are allowed, define whether status means the first or latest answer; neither choice adds an individual reset. |
| Practice advancement | Recording an answer automatically opens the next unanswered question | Answer selection commits immediately; there is no separate submission step. Earlier answered questions remain available for read-only inspection. |
| Timing | Count active practice-screen time, including reading; no inactivity timeout or time limit | This measures active-session duration, not keystroke-only time. An idle cutoff could incorrectly exclude time spent reading. |
| Practice scoring | Report correct count out of the run length and percentage; no pass/fail threshold | Sets carry no passing threshold. |

The phase plans use the remaining proposed defaults as planning assumptions.
Confirm or revise each assumption before implementing its affected behavior.
Answer-driven learning completion, delayed feedback, read-only practice review,
the absence of learning timing, the Quizdeck name, the demo-first startup, the
plain-array file format, replace-and-reset loading, load confirmation, set display
names, working-directory path resolution, the `bin` launchers, and the
`min(60, N)` practice length are confirmed requirements. Storage media,
platform-specific CLI locations, and Jotai-backed application state are agreed
decisions specified in sections 7 and 10. CLI and web share behavior, not
persisted data: their local databases, and therefore their loaded sets, remain
separate.

## 3. Question sets

### File format

A question set file is UTF-8 JSON containing a plain array, exactly the shape of
the former `src/questions.json`:

```json
[
  {
    "id": 1,
    "description": "Question text",
    "answers": [
      { "text": "Choice A", "correct": true, "justification": "Why A is right" },
      { "text": "Choice B", "correct": false, "justification": "" }
    ]
  }
]
```

Validation (shared Zod schema, identical in both interfaces):

- The array contains at least one question; question `id`s are unique positive
  safe integers.
- `description` and every answer `text` are non-blank strings.
- Each question has at least two answers and exactly one `correct: true`.
- `justification` is a string and may be empty; an empty justification is shown
  as missing from the source, never invented.
- No additional properties are accepted, at any level.

Preserve source wording, ID values, and answer ordering exactly. Questions are
listed by ascending ID regardless of their order in the file. A file that fails
JSON parsing or validation is rejected as a whole with readable errors that name
the JSON location (for example, `[12].answers: Each question must have exactly one
correct answer`); nothing is partially imported and stored data is untouched.

### Set display names

The file format has no title field. A set's display name is derived from its file
name; renaming the file renames the set on the next load.

1. Drop the directory and a trailing `.json` (case-insensitive).
2. Split into words at `-`, `_`, `.`, and whitespace, and at camelCase/PascalCase
   boundaries: before an uppercase letter that follows a lowercase letter or
   digit, and before the last uppercase letter of an uppercase run that is
   followed by a lowercase letter.
3. Upper-case the first character of each word, leave its remaining characters
   unchanged, and join the words with single spaces.
4. If nothing remains, the name is **Untitled Set**.

| File | Display name |
| --- | --- |
| `demoSet` (the demo's identifier) | Demo Set |
| `networkBasics.json` | Network Basics |
| `historyProcessed.json` | History Processed |
| `questions.json` | Questions |
| `sql-joins_review.json` | Sql Joins Review |
| `awsIAMRoles.json` | Aws IAM Roles |

### Demo set

The application bundles three generic questions as source code, not as a JSON
asset that could be mistaken for user content. The demo is seeded into a store
only when that store holds no set (first launch at a new location or origin).
It contains at least one three-choice question so the variable-choice path is
visible. Its display name is **Demo Set**. Once another set is loaded, the demo is
not restored automatically and no "restore demo" action is planned.

### Loading replaces the set and resets everything else

Loading is one atomic replacement of the store's contents:

1. Read and validate the file completely before any storage write.
2. Obtain confirmation:
   - **Web:** always, through a confirmation dialog shown after the dropped or
     picked file validates. Cancel changes nothing.
   - **CLI:** no prompt when the store holds no learning answers and no practice
     runs. Otherwise, an interactive confirmation on a TTY; `--yes` skips it; a
     non-TTY invocation without `--yes` fails without changes.
3. In one transaction: store the new set and its metadata (display name, load
   time, content hash, question count) and delete every learning answer, practice
   run (active, paused, and completed), timing checkpoint, and run-ownership
   record. Bump the store revision.
4. Publish the new projection only after the commit. Loading the same file again
   is still a full reset; there is no merge, append, or deduplication.

Failure at any step leaves the previous set and all progress unchanged.

- **CLI:** `load <path>` is a Clipanion command. A relative `path` resolves
  against the process working directory (`process.cwd()`). It opens SQLite,
  performs the replacement, prints the new set's name and question count plus
  what was cleared, and exits. It never launches Ink or the web host.
- **Web:** Dropping a file anywhere on the ready application, or choosing one with
  the **Load question set** control in Extras -> Overview, starts the same flow.
  While dragging, a visible drop overlay explains the action. Browser default
  file navigation is prevented. Multiple files, non-file drops, and drops before
  storage is ready are rejected with a message.
- Each interface loads into its own store. Loading in the CLI does not change the
  browser's set, and dropping a file in the browser does not change the CLI's.
  The CLI's `web` command serves the application only; it does not transfer the
  CLI's set to the browser.

### Other sessions during a load

Another session on the same store (a second Ink process, another browser tab) may
be open while a load commits.

- Existing change notifications (SQLite `data_version` monitoring, browser
  `BroadcastChannel`) refresh that session onto the new set.
- An open learning detail or practice run that no longer exists closes, returns
  to its list, and shows a notice that the question set was replaced. This is a
  normal transition, not a storage error.
- A session whose practice run was deleted stops its timer and discards its
  in-memory interval; its next heartbeat must not recreate the run or report a
  failure that blocks further use.

## 4. Navigation and information architecture

The top-level order is **Learn**, **Practice**, then **Extras**. Extras groups
**Overview**, **Storage**, and **Help**, in that order, in both apps.

- Overview shows the current set's display name, whether it is the demo, load
  time, question/answer counts, and answers without justifications. The web
  Overview hosts the **Load question set** control; the CLI Overview shows the
  `load` command to use.
- Learn opens the question list, then a question-detail view.
- Practice opens a run list with **Start new run**, resumable runs, and completed
  runs. Starting a run opens its first question; resuming opens its saved current
  question; opening a completed run opens its report.
- Leaving an unfinished practice run pauses it; it does not complete or discard
  it. Starting another run does not replace existing runs.
- The CLI and web may use different layouts, but must expose the same actions,
  progress states, and report information. The single intentional difference is
  the loading mechanism (command versus drop/file picker).
- CLI learning and practice share question/answer presentation and key semantics:
  identical prompt separation, wrapping, cyan answer focus, scrolling, and h/l
  navigation. Practice-specific sequencing, read-only review, and end-only feedback
  remain enforced; common design does not disclose practice correctness early.

### CLI command surface and web launch

Use [Clipanion](https://mael.dev/clipanion/docs/paths/) for command routing, help,
argument validation, and exit behavior. The binary name is `quizdeck`. Register
the interactive command as `Command.Default`: invoking the CLI without a
subcommand launches the Ink interface. Separate `web` and `load` commands launch
the web host or perform a load without starting Ink. Do not maintain a parallel
handwritten argument parser.

### Launchers and `bin`

Follow the layout Yarn itself ships: the `package.json` `bin` field maps
`quizdeck` to a Node entry script, and shell launchers sit beside it.

| File | Role |
| --- | --- |
| `bin/quizdeck.js` | `#!/usr/bin/env node` ESM entry; imports `runCli` from the built `dist/cli/main.js`, sets `process.exitCode`. Target of `"bin": { "quizdeck": "bin/quizdeck.js" }` |
| `bin/quizdeck` | Bash launcher: resolves its own directory through symlinks, then `exec node "$dir/quizdeck.js" "$@"` |
| `bin/quizdeck.cmd` | Windows Command Prompt launcher: `node "%~dp0quizdeck.js" %*`, returning Node's exit code |
| `bin/quizdeck.ps1` | PowerShell launcher: `& node (Join-Path $PSScriptRoot 'quizdeck.js') @args; exit $LASTEXITCODE` |

- `bin` points at the JavaScript entry rather than a shell script because package
  managers execute or shim `bin` targets with Node (Yarn runs them through `node`;
  npm generates its own `.cmd`/`.ps1` shims from the shebang). The three launchers
  serve direct use, such as adding the repository's `bin/` directory to `PATH`.
- Launchers run the built CLI; a missing build produces an actionable message
  naming `yarn build`, not a stack trace. A missing `node` is reported clearly.
- Launchers forward every argument unchanged, preserve the caller's working
  directory, and propagate the exit status.
- `.gitattributes` keeps `bin/quizdeck` LF with the executable bit and the `.cmd`
  file CRLF.
- Publication to a registry is not part of this vision; the `bin` field supports
  `yarn run quizdeck`, `yarn link`/`npm link`, and local installs.

| Invocation | Behavior |
| --- | --- |
| `yarn cli` / `yarn start:cli` | Launch the interactive Ink interface |
| `yarn cli load <path>` / `yarn start:cli load <path>` | Validate the file and replace the CLI store's set, resetting all CLI progress (`--yes` skips confirmation) |
| `yarn cli web` / `yarn start:cli web` | Start the web application's local HTTP host and print its URL |
| `yarn cli --help` / `yarn cli <command> --help` | Show Clipanion command help without launching either interface |
| `quizdeck [load <path> \| web \| --help]` | The same commands through the `bin` entry or a launcher in `bin/` |

- `load` errors (missing file, unreadable file, invalid JSON, schema violations,
  declined confirmation, storage failure) produce a non-zero exit status and an
  actionable message without a stack trace.
- Relative `load` paths resolve against `process.cwd()`, with no special handling
  of package-manager environment variables.
- The web command serves the Vite-built application bundled with the application
  distribution. Resolve assets relative to the installed application, not the
  current working directory. Missing assets produce an actionable build/install
  error; do not silently substitute a development server or a different UI.
- Default to `http://127.0.0.1:4173` and keep that origin stable so browser data
  is retained between launches. If the port is occupied, explain the conflict;
  do not silently select another port and appear to lose IndexedDB data.
- Run the web host in the foreground, print the browser URL, and shut it down
  cleanly on interruption. Automatic browser opening or a detached background
  daemon is not required. The existing Vite development script continues to own
  development/HMR; the user-facing web command is not a Vite development wrapper.
- Serve only the built web assets; do not expose the SQLite database, source tree,
  or filesystem traversal through the local host.
- A browser launched against this host still uses IndexedDB. The web command does
  not turn SQLite into a web backend, copy CLI data, start a CLI practice timer,
  or synchronize the two stores.

## 5. Learning mode

### Question list

- Include all questions of the current set, ordered by original question ID.
- Show original ID, a question-text preview, and a textual progress indicator.
- Render correctly answered statuses green and incorrectly answered statuses red
  in both renderers; retain textual labels alongside color.
- Search by original ID or question-description text, case-insensitively. Avoid
  matching hidden explanation text to keep search results understandable.
- Support status filters: **All**, **Unanswered**, **Completed**, **Correctly
  answered**, **Incorrectly answered**. Completed includes both answer outcomes.
- Show completed/total progress separately from the filtered result count.
- Empty search results must not look like an empty question set.
- Opening and returning from a question preserves the current query, filter,
  and focused list row for the current session. Loading a set clears them.

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
- Revealed correct answers render green and incorrect answers red in both apps.
  Unanswered choices have no correctness colors; focus treatment remains visible.
  Practice applies correctness colors only in its completed report, never as
  early correctness feedback.
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

### Global reset

**Reset all learning progress** requires explicit confirmation describing the
scope. One atomic operation returns every learning question to `unanswered`
and clears its recorded learning answer and correctness status. It leaves the
set and all practice runs, answers, timings, and reports untouched.
Cancellation changes nothing. Loading a set is a separate, broader action
(section 3) and is never triggered by this reset.

## 6. Practice mode

### Creating a run

- The run length is `L = min(60, question count)` of the current set, fixed when
  the run is created and stored as the length of its ordered selection. A set
  with three questions produces three-question runs.
- Sample `L` distinct original question IDs uniformly without replacement from
  the full set, independent of learning completion.
- Randomize their order. Different runs may legitimately overlap or even happen
  to produce the same sample; uniqueness between runs is not a requirement.
- Persist the run identity and ordered selection before displaying its first
  question. Never redraw the sample when resuming.
- Preserve the source answer order; answer shuffling is not in scope.
- Every valid set has at least one question, so practice is always available.

### Answering sequentially and inspecting previous answers

- Show **Practice question N of L**, the description, and actual choices. As in
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
- Recording the answer to question `L` completes the run and opens its report in
  the same operation. There is no separate **Finish run** action or partial report.
- Moving focus among choices is not answering. Click, explicit keyboard
  activation, or an answer shortcut gives an answer; navigation alone does not.
- Repeated activation of the same answered question cannot overwrite its answer
  or accidentally answer/skip the following question.

This is a local study tool, not a tamper-proof assessment. Hiding feedback in the
interface does not make the answer key inaccessible in local storage.

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
- The history list shows run identity/date, status, answered count out of `L`,
  and elapsed active time. Score appears only for completed runs.
- Run deletion, renaming, and practice-history reset are not offered. Loading a
  set deletes all runs as part of its reset (section 3).

### End-of-run report

Persist completion and its reportable outcome together before presenting success.
The report remains available after restarting the application and contains:

- Correct count out of `L` and percentage, completion date, and total active time.
- Every question in the original practice order.
- **Practice position -> original question ID**, for example
  **Practice question 1 -> set question 5**.
- The question text, recorded choice, correct choice, correctly/incorrectly
  answered status, and source justifications for each question, including explicit
  missing-justification notices where applicable.

Do not sort the primary report by question ID: the practice-position mapping must
remain obvious. A paused run exposes resume/progress information, not this report.

## 7. Persistence and storage

### Storage decisions

| Interface | Medium | Location / ownership |
| --- | --- | --- |
| CLI (Linux / Unix) | SQLite | `$XDG_DATA_HOME/quizdeck/progress.sqlite` when `XDG_DATA_HOME` is an absolute path; otherwise `~/.local/share/quizdeck/progress.sqlite` |
| CLI (Windows) | SQLite | `%LOCALAPPDATA%\quizdeck\progress.sqlite`; if `LOCALAPPDATA` is unavailable or invalid, use `AppData\Local\quizdeck\progress.sqlite` under the user's home directory |
| Web | IndexedDB | Database `quizdeck`, scoped to the browser profile and application origin; change notifications use the `quizdeck-progress:<database>` `BroadcastChannel` |

The store holds the current question set alongside progress: question content is
persisted user data, not bundled application data.

Stores created under the application's previous identifier are neither read,
migrated, nor deleted. A renamed application starts at the new locations with the
demo set; users reload their own file. Quizdeck stores start at schema version 1
in the single-set layout below, so no multi-set Quizdeck store ever exists.

SQLite gives the CLI atomic updates and durable records without a database
server. The location is independent of the checkout or working directory and is
outside source control. Native `node:sqlite` in the pinned Node runtime is used.

On Windows, the usual resolved path is
`C:\Users\<user>\AppData\Local\quizdeck\progress.sqlite`. Resolve paths with
platform-native path handling. Keep the database in local application data, not
roaming `%APPDATA%`, Documents, the checkout, or a cloud-synced folder. Any
SQLite journal/WAL sidecar files stay alongside the database. The database
location does not depend on where the CLI executable is installed.

IndexedDB provides transactional browser-local records without introducing a
backend. Keep a stable deployed origin: another host or port has a different
store, and therefore a different set. Do not treat `localStorage`, a React state
atom, or a component-unmount handler as the durable source of truth.

### Logical records

This is a conceptual data contract, not a database schema or TypeScript API.

- **Current set:** exactly one per store once initialized. The validated questions
  plus metadata: display name, source (`demo` or `file`), load time, content hash
  (integrity check of the persisted payload), and question count. There is no
  catalog of historical sets.
- **Learning progress:** original question ID, recorded answer index, and
  completion status (`correctly_answered` or `incorrectly_answered`); no record
  means `unanswered`. Every record refers to the current set. No learning
  time-tracking fields are stored.
- **Practice run:** unique run ID, creation/completion times, lifecycle state,
  ordered list of `L` distinct IDs from the current set (`1 <= L <= 60`),
  recorded answers and their correct/incorrect outcomes, next unanswered position,
  viewed position, accumulated active milliseconds, and a completed-result summary
  once finished. Frontier, viewed-position, and result consistency are validated
  against the run's own `L`.
- **Active timing ownership/checkpoint:** enough durable state to identify the
  writer, recover an interrupted run, and avoid counting two sessions concurrently.
- **Storage version and revision:** support deliberate, non-destructive schema
  migrations and optimistic conflict detection.

Because loading deletes every run and learning answer, records never outlive the
set they were made against; per-record set versions and historical snapshots are
unnecessary. A record that references a question ID absent from the current set
is invalid persisted data, reported as an error rather than silently dropped.

### Durability contract

- Persist each user-visible mutation at the action that causes it, not only at
  session end. This includes set loading, the learning answer/status, practice
  answer/outcome, practice view position, pause/resume, and completion.
- Confirm completion, a load, or advance to the next question only after its
  transaction commits. Storage failure leaves the prior committed state intact and
  explains why the action could not be saved; no silent in-memory-only fallback.
- Loading replaces the set and deletes all learning answers, runs, and ownership
  records in one transaction.
- Learning answer selection commits its choice and completion status atomically
  before revealing feedback. Practice answer selection commits its choice,
  hidden outcome, next/viewed positions, and timing checkpoint atomically.
  Answering question `L` additionally commits the completed state/result.
- Global learning reset is atomic and isolated from practice records.
- Validate loaded files and persisted records at their boundaries using Zod.
  Invalid data or a failed migration must not trigger an automatic reset of user
  data or a silent re-seed of the demo set.
- Prevent simultaneous writers to the same run, including two CLI processes or
  browser tabs. A second opener must not overwrite a newer answer or double-count
  time. Recover stale ownership after a crashed session without advancing progress.
  A load deliberately overrides live ownership because it deletes every run.

### Browser durability limit

Request persistent browser storage and expose whether it was granted. If storage
is unavailable, do not begin an apparently persistable session. If it works but
persistent retention is denied, disclose that limitation before progress begins.

Browser-local storage cannot guarantee survival of user-cleared site data,
private-browsing teardown, device loss, or every browser eviction policy. SQLite
also cannot survive deletion or disk loss. **Persist every interaction** means
transactional saves under available storage, not a guarantee against destruction
of the storage itself. Because loaded sets live in the same store, losing browser
storage also loses the set; reloading the original file restores it, not progress.

## 8. Practice timing

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
- Stop timing when the run is paused, the practice screen is left, the run is
  completed, or the run is deleted by a set load. History, reports, learning, and
  time between sessions do not count.
- Resuming opens a new active interval and adds it to the already saved duration.
- Web: hide/blur of the practice page pauses timing; restoring visibility/focus
  resumes it only when that run's practice view is active and owns the writer.
- CLI: explicit pause/navigation away, process exit, and supported terminal
  suspension stop timing. A live terminal cannot reliably detect every desktop
  focus change; reading time in an open CLI session continues to count.
- Use a monotonic clock within each session, so changing the system clock does not
  change active duration.
- Timing checkpoint interval: one second, plus immediate checkpoints on progress
  actions, pause, and completion. Display whole seconds, store milliseconds.
- Graceful shutdown saves the final interval. After a hard crash, recover from the
  last durable checkpoint and do not add the disconnected period. The final
  uncheckpointed tail can be lost; exact crash-time reconstruction is not promised.
- Browser unload callbacks are best effort, not the persistence strategy. Regular
  checkpoints and action transactions must already have saved useful state.

Example: 8 active minutes, a 2-hour break, and 12 more active minutes produces a
20-minute report, not a 2-hour-20-minute report.

## 9. Vim-like interaction and accessibility

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
| `a`-`d`, `1`-`4` | No answer action | Record an existing choice on an answerable question in either mode; never alter an earlier practice answer or address a nonexistent choice |
| `?` | Open contextual shortcut help | Open contextual shortcut help |
| `q` / `Ctrl-c` (CLI) | Save and exit | Save, pause an unfinished run, and exit; do not bind browser quit shortcuts |

Loaded sets may have more than four choices. Shortcuts stay `a`-`d`/`1`-`4`
(wider letter ranges would collide with Vim motions and `q`); later choices are
answered through choice focus and Enter or a click.

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
- Global reset and set loading are named actions with confirmation, not
  easy-to-hit single-character destructive shortcuts.
- Drag-and-drop is never the only way to load in the web application: the
  **Load question set** control is a native file input reachable by keyboard and
  announced to assistive technology. Load results and validation errors are
  announced as status/alert text.
- CLI quit is a graceful save/pause/exit action. Web Escape returns within the app;
  it does not attempt to close a browser tab.

## 10. Shared architecture boundaries

- Keep question-set validation, the demo set, set replacement, question
  identities, learning transitions, random sampling, practice sequencing, report
  construction, timing rules, and input-action semantics shared.
- Keep DOM, Ink layout, browser lifecycle, terminal lifecycle, file reading,
  drag-and-drop, SQLite, and IndexedDB APIs in their owning renderer/platform
  adapters. The CLI reads files with Node APIs and the web with `File.text()`;
  both pass text and a display name to the same shared parser.
- Use identical transition rules against both storage adapters. Shared models must
  not import Node-only or DOM-only APIs.
- Use Jotai for shared application state in both React DOM and Ink. Reuse the
  shared state/action structure with an IndexedDB adapter for web and a SQLite
  adapter for CLI; inject the adapter rather than importing platform APIs into
  shared atoms. Each application instance owns its own Jotai store.
- Keep component-local hooks for local UI state and Context for one subtree owner.
  Persisted storage remains authoritative; atoms are its reactive projection,
  not a second durable database or a synchronization bridge between CLI and web.
- The non-interactive CLI `load` command uses the same storage adapter and shared
  replacement transaction without creating an Ink renderer.
- Prefer focused modules named for question sets, learning, practice, history,
  state, data, and hooks. Do not introduce generic service/manager layers.

### State ownership

| State category | Examples | Ownership |
| --- | --- | --- |
| Persisted records | Current set and its metadata, learning answers/statuses, practice runs and recorded answers, next/viewed positions, practice timing checkpoints and completed results | IndexedDB or SQLite is authoritative; Jotai exposes the loaded, committed records |
| Derived state | Set overview counts, filtered question lists, completion counts, current question, practice run length, completed-run report | Derived Jotai atoms; do not separately persist or synchronize duplicate calculated values |
| Temporary UI state | Focused row/choice, search input, open help panel, drag overlay, validated-but-unconfirmed load, pending-save and error indicators | Component hooks where local; Jotai where shared across components/features |

Expose focused hooks around nontrivial atom groups so renderers depend on actions
and meaning rather than database details. Practice correctness may be recorded
internally before completion, but UI projections must keep it and justifications
hidden until the run completes. Learning has no timing atoms or persisted timing
fields. A live practice-time display can advance between durable checkpoints;
that display is not a replacement for persisted accumulated time.

### Transaction-aware write path

The agreed mutation flow is:

1. An intentional user action invokes a shared action through a Jotai write atom
   (or, for the CLI `load` command, directly through the shared replacement
   operation against the opened adapter).
2. Shared answer/transition/validation logic determines the intended mutation; the
   UI may show a pending-save indicator without changing acknowledged state.
3. The owning persistence operation validates current records and write ownership
   and commits all coupled fields in one database transaction.
4. Wait for transaction completion, not merely an individual IndexedDB request's
   success. SQLite operations likewise return success only after commit.
5. Publish the committed records into Jotai. Derived atoms update the set
   overview, question list, completion counts, history, and report eligibility.
6. Only then reveal learning feedback, advance practice, display completion, or
   announce a successful load.

The coupled fields are those specified in section 7: set plus the deletion of all
learning, runs, and owners; learning answer plus status; practice answer/outcome
plus next/viewed positions and timing checkpoint; and, for question `L`, completed
state and results. Global learning reset also uses one transaction and publishes
its cleared projection only after commit.

If saving fails, clear the pending indicator, expose the error, and retain the
previous committed projection. Do not reveal unsaved feedback, advance, replace
the visible set, or silently fall back to in-memory state. Prevent overlapping
activations while the same action is pending; per-run persistence operations must
not overwrite newer committed state.

Jotai's atomic state model does not make separate database writes transactional.
Do not persist each related field independently through `atomWithStorage` and
assume the run remains consistent. Core state uses transaction-aware write atoms
backed by focused persistence operations. See
[Jotai storage documentation](https://jotai.org/docs/utilities/storage).

### Startup and multiple sessions

- Open storage, apply required migrations, and validate/load persisted records
  before enabling interaction. Expose loading/error state rather than briefly
  presenting empty progress as the user's actual progress.
- If the store holds no set, seed the demo set in one transaction before the
  first ready state. If another session seeds concurrently, re-read instead of
  failing. Never re-seed a store that already holds a set, and never seed as a
  recovery from invalid data.
- Do not start a resumed practice timer until its persisted run is loaded and the
  application has acquired active-run ownership. Hydration does not answer a
  question or manufacture a new practice run.
- Browser tabs use explicit post-commit notifications (`BroadcastChannel`) and CLI
  processes poll SQLite `data_version` to reload affected records in their Jotai
  projections, including a replaced set. Do not assume Jotai or IndexedDB
  automatically synchronizes atom values across tabs.
- Notifications are not locks. Database-level ownership and conflict checks still
  prevent two writers from changing the same run or counting the same active
  interval twice. Apply stale-session recovery without altering recorded answers.
- Shared Jotai logic does not synchronize the web database with the CLI database;
  that separate local-store boundary is unchanged.

## 11. Web theme and local package references

Use `@sabinmarcu/theme` rather than recreating its tokens or introducing
`@sabinmarcu/website-theme` (which is website-specific).

- Author colocated component styles with Vanilla Extract.
- Use theme contracts for colors, spacing, and other available reusable values;
  add only genuinely application-owned extensions.
- Initialize and emit theme values before the UI needs them. Importing token
  references alone does not assign CSS variables.
- Keep completion, focus, selection, correctness, and drop-target styles semantic
  and include text/shape differences, not only color differences.
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

The application pins published theme 1.2.4. Use the local repository as reference,
not as a machine-specific production dependency. Do not alter local scoped
packages, copy their internals, or assume proposed refactor exports exist.

## 12. Application acceptance scenarios

These are product outcomes, not implementation phases or tests.

| Scenario | Expected outcome in both interfaces |
| --- | --- |
| First launch | A new store opens on the three-question demo set; Overview identifies it as the demo. |
| Load a set | A valid file replaces the set after confirmation; Overview shows its name and counts; all learning progress and practice runs are gone. |
| Reject an invalid file | Malformed JSON or a schema violation reports located errors; the previous set and progress are unchanged. |
| Cancel a load | Declining confirmation (or a non-TTY CLI load without `--yes` on a store with progress) changes nothing. |
| Load while another session is open | The other Ink process or browser tab switches to the new set, closes deleted views with a notice, and does not recreate deleted runs or double-count time. |
| Keep interfaces independent | Loading in the CLI does not change the browser's set or progress, and vice versa. |
| Load without a mouse | The web file picker loads a set by keyboard; results and errors are announced. |
| Find a question | Search and status filtering reach any question and expose its completion status. |
| Learning feedback | Before answering, show only description and choices. Selecting an answer persists its correctly/incorrectly answered completion status and reveals justifications. Both outcomes count as completed. |
| Reopen learning | Restore the recorded choice, correctness status, and revealed justifications. Opening without answering remains unanswered. |
| Reset learning | Confirmation clears all learning progress at once; cancellation clears nothing; the set and practice history survive. |
| Start practice | Exactly `min(60, N)` distinct IDs are selected in a persisted randomized order before answering begins; the demo yields a three-question run. |
| Respect source variation | Questions with any number (>= 2) of choices are fully selectable; empty justifications are reported honestly. |
| Answer sequentially | Activating a choice records it immediately and advances exactly once; focus movement does not answer and unanswered questions cannot be skipped. |
| Inspect earlier practice answers | Move backward/forward through answered questions and see recorded selections without being able to alter them; status and justifications remain hidden until completion. |
| Hide early feedback | No original-ID mapping, correctness, explanation, running score, or partial report is shown in an unfinished run. |
| Resume an interrupted run | The same run ID, sample/order, recorded answers/outcomes, next unanswered position, viewed position, and saved practice time return. |
| Keep runs independent | Starting or completing one run does not replace another; learning progress is independent of both. |
| Accumulate time | 8 minutes + pause + 12 minutes yields 20 active minutes; neither a long break nor report viewing increases it. |
| Keep learning untimed | Reading, answering, and revisiting learning questions creates no learning timers, durations, or timing records and does not add to practice time. |
| Finish and review | Selecting the answer to question `L` commits completion and a persisted report immediately, including every question's status, justifications, and position-to-ID mapping. |
| Recover storage failures | Failed writes do not acknowledge unsaved state or advance the run; recovery does not silently reset data or re-seed the demo. |
| Avoid concurrent corruption | A second process/tab cannot overwrite the same run or count the same active interval twice. |
| Resolve CLI storage | On Windows, use local application data with the documented home-directory fallback; on Linux/Unix, use the XDG/home fallback, both under `quizdeck`. Executable location and working directory do not change the database path. |
| Publish committed state | Jotai reflects persisted records after the whole transaction commits; a failed write leaves the set, answers, completion counts, navigation, and report eligibility at their prior committed values. |
| Hydrate before interaction | Load and validate persisted data before enabling answers or starting a resumed practice timer; no initial empty-state overwrite occurs. |
| Use the keyboard | Learning, answering, pausing/resuming, history, reporting, and loading are operable with the documented Vim-like contexts and standard controls. |
| Use the web theme | Theme-backed styles are initialized, responsive, and accessible without depending on unpublished refactor APIs. |
| Launch the default CLI | With no subcommand, Clipanion dispatches to Ink; help and invalid-command handling do not accidentally start an interactive session. |
| Launch web from the CLI | The separate `web` command serves the built React application at the stable local origin without rendering Ink or opening the CLI database; missing assets and occupied ports produce actionable errors. |
| Stop the web host | Interrupting the foreground web command releases the listener cleanly; a later launch uses the same origin and restores browser-local data. |
| Carry no branding | Tracked files contain no former product or vendor branding; the repository folder name is the only exception. |
| Derive set names | Loading `networkBasics.json` shows **Network Basics**; the demo shows **Demo Set**. |
| Resolve relative load paths | `load ./sets/x.json` resolves against the process working directory. |
| Launch through `bin` | `bin/quizdeck`, `bin/quizdeck.cmd`, `bin/quizdeck.ps1`, and the `bin` entry forward arguments unchanged, keep the caller's working directory, propagate exit status, and explain a missing build. |

## 13. Current state and phased plan

The learning, practice, persistence, Clipanion launch, and web hosting behavior in
sections 5-10 is implemented against a bundled, branded question bank with a
historical bank catalog and a fixed 60-question run. The phases below move from
that state to this vision.

Execute phases in order. Each phase is separated by capability, not renderer: the
same applicable behavior is delivered for Ink and React DOM within that phase.
Every phase ends with a working application; none ships a store layout that a
later phase must migrate.

| Phase | Scope | Dependencies | Plan |
| --- | --- | --- | --- |
| 1 | Quizdeck identity, storage relocation, single persisted set seeded from the demo, variable practice length, relocation of the former bank file | None | [Quizdeck identity and owned question set](01-identity-and-question-set.md) |
| 2 | Shared validated loading with replace-and-reset, CLI `load`, web drag-and-drop/file picker, cross-session replacement | Phase 1 | [Loading question sets](02-loading-question-sets.md) |
| 3 | `bin` field and bash/cmd/PowerShell launchers, documentation, branding audit, build checks | Phases 1-2 | [Distribution and documentation](03-distribution-and-documentation.md) |

Each phase file defines its shared work, CLI and web delivery, exclusions,
behavioral verification, and exit criteria. A phase is not complete merely because
one renderer works or shared functions compile. Real storage and runtime smoke
proof are required for the affected surfaces; implementation must not hide missing
capabilities behind mocks, disabled controls, or in-memory persistence substitutes.

This vision governs behavior. Phase documents govern execution order and scope.
If they conflict, resolve the discrepancy before implementing the affected phase.
Revise this vision and the relevant phase together when a decision changes.

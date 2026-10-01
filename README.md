# claude-certification

React + TypeScript application with React DOM/Vite and an Ink terminal interface.
Learning, practice, transactional local persistence, shared Jotai state, and
Clipanion launch commands are implemented in both interfaces. A planned migration
turns this into a generic, data-free question-set tool with loadable JSON sets;
native Windows and Safari/iOS Safari verification remains open.

[Application vision](docs/planning/vision.md) ·
[Phase 1 — Identity and question set](docs/planning/01-identity-and-question-set.md) ·
[Phase 2 — Loading question sets](docs/planning/02-loading-question-sets.md) ·
[Phase 3 — Distribution and documentation](docs/planning/03-distribution-and-documentation.md)

## Development and launch

Node.js **26.10.0** and Yarn **4.18.1** are pinned in `package.json`. Yarn uses the
`node-modules` linker; npm and Corepack are not used.

```sh
yarn install
yarn cli             # Default Clipanion command: interactive Ink; requires a TTY
yarn cli --help
yarn dev:web         # Vite development/HMR server
yarn build           # Typecheck and build both renderers
yarn start:cli       # Run the built Ink interface
yarn start:cli web   # Serve the built web application
```

`yarn dev:cli` also launches the source Ink command. `yarn cli web` serves the same
built web application; it does not start Vite or build missing assets. Run
`yarn build` first. The built CLI keeps dependencies external, so it requires the
installed runtime dependencies and the sibling `dist/web` build.

The `web` command stays in the foreground at **http://127.0.0.1:4173** and prints
that URL. Open it in a browser; Ctrl-C stops the host. An occupied port fails
without choosing a different origin. Web assets resolve relative to the application
installation, not the caller's current directory. Only built assets are served;
source files and the SQLite database are not web endpoints.

## Shell controls

The top-level order is **Learn**, **Practice**, then **Extras**. Extras contains
**Overview**, **Storage**, and **Help**, in that order.

- `j/k`, `h/l`, or arrows move menu focus; **Enter** opens the focused item.
- `gg`/Home and `G`/End focus the first and last items in the current menu.
- `?` opens Extras → Help in menus; learning and practice retain contextual help.
  Escape closes Extras or returns to the parent/menu focus; Ctrl-d/u scrolls.
- CLI: `q` or Ctrl-C exits; `r` retries after a storage error.
- Web: Tab, click, and touch work alongside shortcuts. Text editing and composition
  do not trigger character shortcuts. A denied persistent-retention request must
  be acknowledged before entering the shell.

Extras → Overview reports the real bank and saved-record counts. Extras → Storage
shows the backend, location, retention, and revision. Opening a menu does not
answer a question, infer learning completion, or start a practice timer.

## Learning mode

Open **Learn** in either interface. Search by source question number or description,
and filter All, Unanswered, Completed, Correctly answered, or Incorrectly answered.
Completed/total counts remain independent of the current search results.

Opening a question or moving choice focus does not complete it. Activate a choice
with Enter, a–d/1–4, or a web button; there is no separate submit step. The answer
and correct/incorrect completion status are persisted together, then correctness
and justifications are shown. Missing source explanations are identified honestly.
Correctly answered question statuses are green; incorrectly answered statuses are
red. Revealed correct choices are green and all incorrect choices are red in both
apps. Unanswered choices have no correctness colors; textual labels accompany color.
The current policy retains the first answer until **Reset all learning progress**;
there is no per-question reset or re-answer control. Reopening restores feedback.
Learning has no timers or timing records.

If source content changes, the list uses the current bank but an answered detail
uses its recorded bank version for consistent choice/outcome/justification feedback.
A historical-content notice explains the difference; completion is not silently
reset. Global reset permits answering against the current bank.

The global reset requires confirmation, defaults to Cancel, and clears only
learning answers/statuses after a successful transaction. Practice records, bank
snapshots, and their timing are untouched. Failed saves leave prior committed
progress intact and display the error; stale-session conflicts require reloading
the application before trying again.

- `/` edits search; Escape stops editing without clearing. CLI `c` or web
  **Clear search** clears it; CLI `f` cycles the status filter.
- In the list, `j/k` moves focus, `gg/G` reaches boundaries, and Enter or `l`
  opens a row. `h` or Escape returns to the shell.
- In detail, `h/l` or left/right browse the filtered order captured on opening,
  even if answering removes a row from Unanswered; Escape or web
  **Back to list** restores list context. `j/k` focuses unanswered choices or
  scrolls answered feedback; Ctrl-d/u scrolls longer content.
- CLI `r` opens the named global-reset confirmation; `j/k` selects Cancel/Confirm
  and Enter activates it. `q` types normally while search owns input.
- CLI question detail separates the prompt and choices with extra space. The
  focused unanswered choice is marked with `›` and highlighted cyan directly,
  including wrapped text; hotkeys appear once in the footer. Moving focus does
  not record an answer, and saved choices retain green/red correctness colors.
- Web uses native search/filter/buttons and reset/help dialogs, with focus restored
  after dismissal. Tab, click, touch, and text composition remain available.

Query, filter, and preferred list row are retained within the application session.
Permanent answer/status records survive application restarts.

## Practice mode

Open **Practice** and start a new run or resume/review an existing one. Each new
run saves a randomized order of **60 distinct questions** before presenting its
first question. Runs are independent; starting another does not replace history.

Activate an answer once with a choice button, Enter, or a–d/1–4. A successful
transaction records the answer and advances to the next unanswered question.
Earlier questions can be inspected with h/l or previous/next controls, showing
the recorded choice read-only. Future questions cannot be skipped, and neither
correctness, explanations, a running score, nor dataset-ID mapping is shown early.

Answer 60 commits completion and opens the saved report immediately. Reports
contain all 60 questions in practice order, the **practice position → dataset ID**
mapping, selected/correct choices, outcomes, and source explanations. Correct
statuses/choices are green and incorrect ones red, with textual labels. Completed
runs and results are immutable and remain reviewable after restarting.

CLI learning and practice use the **same question renderer, spacing, inline cyan
focus marker, wrapping, scrolling, and question key map**. Practice run progress
and elapsed time appear above the question, not as a second instruction block.
The shared presentation is also used for questions in completed CLI reports.
Blank lines separate the question heading from its description and the answer
block from interface hints in both CLI modes.

- History: j/k focuses actions/runs, Enter opens, n starts a run, gg/G reaches ends.
- Questions: j/k focuses an unanswered choice or reads read-only content;
  h/l or left/right moves through available questions. The last available question
  is the single next unanswered question; earlier answers are read-only. There is
  no separate jump-to-unanswered shortcut.
- p pauses/resumes. Escape returns from a question/report to practice history;
  from history, Escape returns to the application menu/learning section.
- Web also offers named buttons, native focus navigation, help, and pointer/touch.
- Enhanced terminal key-event reporting suppresses repeat events. Legacy terminals
  cannot report releases: before reusing the **same** answer shortcut on the next
  question, move choice focus with j/k, or use a different equivalent shortcut
  (a and 1 both select the first choice). This prevents a held key from answering
  multiple immutable questions; no extra submit/confirmation step is introduced.

Only **active practice intervals** are timed. Reading and earlier-answer review
count; manual pauses, leaving practice, completed reports, and time between sessions
do not. Web hide/blur/Extras pauses automatically and resumes only for an active,
visible, focused practice view; a manual pause stays paused. CLI q/Ctrl-C/SIGTERM
save/pause before exit. On POSIX hosts, Ctrl-Z/SIGTSTP also releases Ink's screen
and cursor before suspension, then restores it and eligible practice on SIGCONT.

Time uses a monotonic session clock and durable cumulative milliseconds. Quiet
one-second checkpoints do not flash user save indicators. A hard crash recovers
the last committed answers/time without adding the disconnected period; the final
uncheckpointed tail may be lost. Stale writer leases expire after five seconds,
so interrupted runs may briefly reject resumption rather than allowing two writers
to overwrite answers or count time concurrently.

Practice never marks learning completion, and global learning reset preserves all
practice runs, answers, timings, and reports. SQLite and IndexedDB remain independent.

## Persistence and state

| Interface | Backend | Location |
| --- | --- | --- |
| CLI, Linux/Unix | Native `node:sqlite` | Absolute `$XDG_DATA_HOME/claude-certification/progress.sqlite`, otherwise `~/.local/share/claude-certification/progress.sqlite` |
| CLI, Windows | Native `node:sqlite` | Absolute `%LOCALAPPDATA%\claude-certification\progress.sqlite`, otherwise `AppData\Local\claude-certification\progress.sqlite` beneath the user's home directory |
| Web | Native IndexedDB | Database `claude-certification` in the current browser profile and origin |

The stores are independent. Running the CLI's `web` command does not open SQLite
or share CLI progress with the browser. A Vite development origin and the fixed
production origin have different browser databases.

Zod validates the bank and persisted records. Immutable bank snapshots are stored
once per SHA-256 content version. Versioned records, revision conflicts, and timing
ownership protect current workflows; unsupported or corrupt data is reported,
never automatically reset. The current storage schema is version 1; later versions
require an explicit non-destructive migration.

Each application instance owns a Jotai store backed by its platform adapter.
Startup loads validated persisted state before enabling interaction. Transactions
commit coupled changes before publishing atom projections; failed writes do not
acknowledge progress. Browser post-commit notifications reload projections across
tabs but do not grant writer ownership.
SQLite observes native database changes once per second while a UI subscribes,
refreshing another CLI's committed projection without granting writer ownership.

Browser persistent retention is requested. Denied or unavailable retention means
best-effort storage, not an in-memory fallback. Site-data clearing, private-session
teardown, or browser eviction can still remove browser progress. Unavailable storage
is an explicit startup error. SQLite files can likewise be deleted or lost.

## Question bank

`src/questions.json` contains **175 questions and 699 answer choices**. Source IDs
and answer order are preserved. Every question has exactly one correct answer.

```ts
{
  id: number;
  description: string;
  answers: {
    text: string;
    correct: boolean;
    justification: string;
  }[];
}[]
```

Questions **3** and **57** omit six incorrect-choice explanations; their
`justification` strings are empty. Question **140** has three choices, not four.
Source wording and duplicates are retained; correctness reflects the supplied
answer key, not an independent assessment.

## Checks and tooling

```sh
yarn test
yarn typecheck
yarn lint:fix
yarn build
```

`yarn build:web` and `yarn build:cli` build individual renderers. `yarn preview`
previews the web build separately from Clipanion's `web` command.

ESLint uses `@sabinmarcu/eslint-config` with React, hooks, TypeScript, and accessibility
rules. Husky runs lint-staged then typechecking before commits, and commitlint
validates Conventional Commits. VS Code uses ESLint, not Prettier. Tests use
explicit Vitest imports in colocated specs. Compiler configurations split base,
editor/typecheck, and source build scope.

Web components use Vanilla Extract and `@sabinmarcu/theme`; theme values and public
contract aliases are initialized before rendering. Theme 1.2.4 is pinned because
1.2.5 omits its declared built entry points; unused MUI and Storybook integrations
are marked optional.

Known upstream tooling warning: the shared ESLint config requires ESLint 9 while
its Unicorn dependency declares ESLint 10.4+. The configured lint command passes.
The web build also reports a large initial chunk containing the bundled question
bank and application dependencies; no chunk-warning suppression is configured.

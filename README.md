# claude-certification

React + TypeScript application with React DOM/Vite and an Ink terminal interface.
Phases 1 and 2 are implemented: validated question data, transactional local
persistence, shared Jotai state, Clipanion commands, and searchable learning in
both interfaces. Practice runs and timing remain reserved for Phase 3.

[Application vision](docs/planning/vision.md) ·
[Phase 1](docs/planning/01-foundations-and-launch.md) ·
[Phase 2](docs/planning/02-learning-mode.md) ·
[Remaining implementation phases](docs/planning/vision.md#12-phased-implementation-plan)

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

The top-level order is **Learn**, then **Extras**. Extras contains **Overview**,
**Storage**, and **Help**, in that order. Practice will be inserted after Learn
when its workflow is implemented; no placeholder menu entry is shown.

- `j/k`, `h/l`, or arrows move menu focus; **Enter** opens the focused item.
- `gg`/Home and `G`/End focus the first and last items in the current menu.
- `?` opens Extras → Help outside learning; learning retains its contextual help.
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
ownership are real persistence primitives for the later workflows; unsupported or
corrupt data is reported, never automatically reset. The current storage schema
is version 1; later versions require an explicit non-destructive migration.

Each application instance owns a Jotai store backed by its platform adapter.
Startup loads validated persisted state before enabling interaction. Transactions
commit coupled changes before publishing atom projections; failed writes do not
acknowledge progress. Browser post-commit notifications reload projections across
tabs but do not grant writer ownership.

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

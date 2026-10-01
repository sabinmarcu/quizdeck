# claude-certification

React + TypeScript application with React DOM/Vite and an Ink terminal interface.
Phase 1 is implemented: validated question data, transactional local persistence,
shared Jotai startup/state, Overview/Storage/Help shells, and Clipanion commands.
Learning and practice workflows belong to the later phases and are not exposed yet.

[Application vision](docs/planning/vision.md) ·
[Phase 1](docs/planning/01-foundations-and-launch.md) ·
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

- `j/k`, `h/l`, or arrows move section focus; **Enter** opens the focused section.
- `gg`/Home and `G`/End focus the first and last sections.
- `?` opens Help; Escape returns to Overview; Ctrl-d/u scrolls half a page.
- CLI: `q` or Ctrl-C exits; `r` retries after a storage error.
- Web: Tab, click, and touch work alongside shortcuts. Text editing and composition
  do not trigger character shortcuts. A denied persistent-retention request must
  be acknowledged before entering the shell.

Overview reports the real bank and saved-record counts. Storage exposes the actual
backend, location, retention, and revision. Opening the shell does not answer a
question, infer learning completion, or start a practice timer.

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

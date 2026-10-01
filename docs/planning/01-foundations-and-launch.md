# Phase 1 — Foundations and launch

**Status:** implemented. **Dependencies:** none.

[Vision](vision.md) · Next: [Phase 2 — Learning](02-learning-mode.md)

## Outcome and scope

Both applications start with the same validated question bank, real local storage,
shared Jotai state, and explicit startup/error handling. Clipanion dispatches the
CLI's default invocation to Ink and a separate `web` invocation to the built web
application's local host.

This phase owns shared foundations and platform startup together. It is not a
CLI-first phase followed by a deferred web counterpart. It does not claim learning
or practice behavior is delivered; those features have their own complete phases.
Do not add fake mode implementations or disabled controls to suggest otherwise.

## Inputs and decisions

- Follow vision sections 1, 3, 6, 8-10 and the active repository instructions.
- Use `src/questions.json`; preserve IDs, choice order, source wording, the
  three-choice question, and missing justifications.
- The agreed stores are SQLite for CLI and IndexedDB for web; neither synchronizes
  with the other. Shared state uses Jotai in both renderers.
- Keep the pinned Node/Yarn toolchain and existing Vite/esbuild build ownership.
- Add the required runtime dependencies during implementation: Clipanion, Jotai,
  and Zod. Verify native `node:sqlite` support in the pinned runtime rather than
  assuming a particular API or introducing an unnecessary database service.
- The remaining learning/practice product defaults do not block infrastructure,
  but must not be silently finalized by its interfaces.

## Shared implementation

1. **Question bank and records**
   - Validate the bank with Zod: stable unique IDs, usable description/choices,
     exactly one correct answer, and justification strings that may be empty.
   - Identify bank content with a stable version/content identifier. Persist an
     immutable bank snapshot once per version for historical run references.
   - Define the concrete learning-answer, practice-run, timing ownership, and
     storage-version records from the vision. Keep source IDs distinct from
     practice positions and viewed position distinct from the answer frontier.
   - Do not store learning timing fields or infer completion from viewing.
2. **Real persistence foundations**
   - Implement schema initialization/versioning, validated record loading, and
     transaction support for both stores. Keep storage outside renderer code.
   - Establish the same commit/result and conflict semantics for both adapters;
     wait for actual transaction completion before returning success.
   - Preserve existing records during migrations. Invalid records, failed
     migrations, and unavailable storage produce explicit errors, not a reset or
     an in-memory substitute.
   - Establish durable revision/ownership primitives needed by practice. Add
     complete feature mutations in their owning phases, not placeholder methods.
3. **Jotai startup and ownership**
   - Create one store per application instance with the platform adapter injected.
   - Load validated persisted records before exposing interaction. Represent
     loading, ready, and failed startup separately from empty progress.
   - Keep persisted-record atoms as projections; use derived atoms for calculated
     values and local state/hooks for local focus or overlays.
   - Establish transaction-aware action plumbing and pending/error presentation.
     Do not use independent `atomWithStorage` writes for coupled progress fields.
   - Implement post-commit browser notifications/invalidation without treating
     notifications as writer locks. Do not import Node or DOM APIs into shared
     models or atom definitions.
4. **Interaction and application shell**
   - Establish semantic screen/action contexts, focus ownership, contextual help,
     and Vim-motion handling alongside arrows/Enter and native web controls.
   - Character shortcuts must not override text editing or composition. Focus
     movement must not become an answer activation.
   - The shell must expose real loading/storage errors and loaded bank information;
     feature screens and navigation entries are introduced with their phases.

## CLI delivery

- Resolve SQLite to the vision's XDG/home location on Linux/Unix and local
  application-data location/fallback on Windows. Create the application's data
  directory; keep journal/WAL files beside the database.
- Initialize CLI progress storage only for the interactive Ink command. The `web`
  command must not initialize SQLite, acquire a CLI run, or start a practice clock.
- Replace the direct Ink-only entrypoint with Clipanion command registration.
  Use `Command.Default` for the interactive command and a distinct `web` path.
  Clipanion owns help, validation, dispatch, errors, and process exit status.
- Preserve the script surface: `yarn cli` and `yarn start:cli` launch Ink;
  appending `web` selects the web host. Unknown commands/options must not fall
  through to the Ink interface.
- The `web` command serves `dist/web` from the application distribution using an
  installed-module-relative asset root, never the caller's current directory.
  It is a foreground local host at `127.0.0.1:4173` that prints its browser URL.
- Fail clearly for missing assets or an occupied port. Do not auto-build, replace
  the application with a dev server, silently change the origin, launch an Ink
  session too, or add background-daemon behavior.
- Restrict HTTP access to built web assets. Prevent traversal/source/database
  exposure and close the listener on graceful interruption. Keep the existing
  Vite development command as the separate HMR workflow.
- Use platform-appropriate terminal lifecycle and interactive-input checks so
  unsupported/non-interactive use reports an actionable error rather than a
  raw-mode failure.

## Web delivery

- Open IndexedDB `claude-certification` for the current origin and hydrate the
  same Jotai record/action model using the browser adapter.
- Request persistent browser storage; distinguish unusable storage from a denied
  retention request and disclose retention limits as specified in the vision.
- Render the real startup/loading/error/shell states with semantic HTML, keyboard
  focus, and narrow-viewport support.
- Initialize `@sabinmarcu/theme` token values and use colocated Vanilla Extract
  styles. Consult the supplied local theme sources; do not assume the proposed
  theme refactor is implemented or make local filesystem paths dependencies.
- The Vite-served and CLI-hosted web surface use the same React application. Their
  different development/production origins legitimately have different browser
  stores; document this rather than attempting to copy progress implicitly.

## Exclusions

No learning-answer workflow, practice UI, cloud/API synchronization, accounts,
portable database transfer, automatic browser opener, global command installation,
or publication workflow. No changes to scoped packages in the local omnirepo.

## Verification

- Run the real source and built CLI commands in a terminal. Observe default Ink,
  help, invalid-command behavior, storage startup, and graceful exit.
- Build both renderers and launch `web` from the CLI. Open the printed URL in a
  real browser; observe the React shell and actual IndexedDB initialization.
- Run the built web command from another working directory. Exercise missing
  assets, an occupied port, shutdown, and relaunch at the same origin.
- Exercise real SQLite and IndexedDB record transactions with isolated storage:
  successful commit, failed/aborted multi-field write, invalid persisted data,
  and migration preservation. Verify stored values after reopening.
- Use behavior-focused Vitest tests for uncertain validation/transaction boundaries;
  do not add tests that merely echo configuration or command forwarding.
- Typecheck and run ESLint fixing checks after implementation; keep browser/terminal
  smoke evidence separate from unit-test results. Remove throwaway fixtures.

## Exit criteria

Both adapters and renderer startups work against real storage; no fallback hides
storage errors. Default Clipanion invocation opens Ink, `web` opens a real local
web host, and neither launches the wrong renderer. Built assets resolve outside
the checkout working directory. Theme-backed web startup is observed, shared
state is platform-neutral, and no unrelated feature behavior is advertised.

## Implementation and verification evidence

- Shared Zod bank/record validation, SHA-256 bank versions, revision-checked
  transactions, ownership primitives, and Jotai hydration/commit projections are
  implemented under `src/data` and `src/state`.
- `src/cli` implements native SQLite, platform data paths, Clipanion default Ink
  and `web` commands, and a fixed-origin built-asset host. `src/web` implements
  native IndexedDB, retention disclosure, post-commit notifications, and the
  theme-backed Overview/Storage/Help shell. Learning/practice UI remains excluded.
- Source and built Ink were exercised in real pseudo-terminals, including a
  narrow terminal, keyboard focus/help/storage navigation, and clean `q` exit.
- Source and built web commands served the actual browser application at the
  fixed origin. The built host ran from outside the repository working directory;
  missing builds, occupied ports, traversal/source requests, symlink escapes,
  interruption, and same-origin relaunch were exercised.
  Symlinked CLI entrypoints were also exercised; expected missing-build/port
  conflicts render as Clipanion usage errors without internal stack traces.
- Native browser IndexedDB checks covered committed records, stale revisions,
  an aborted multi-record transaction after a native key conflict, reopening,
  invalid metadata preservation, future native-version rejection, and cross-tab
  Jotai refresh. Corrupt/unavailable storage showed actual shell errors, and
  restored storage recovered through Reload without resetting records.
- Browser smoke covered best-effort retention acknowledgment, Vim-like/native
  navigation, text-input shortcut isolation, half-page scrolling, light/dark
  theme values, and a 390-pixel layout without horizontal overflow.
- 33 colocated Vitest tests passed, including real SQLite rollback/reopen/conflict
  checks and Windows path resolution. Typechecking, ESLint fixing checks, both
  builds, and immutable Yarn installation passed. AI managed status is current.
- Runtime proof was collected on Linux and Chromium. Windows storage paths were
  exercised through injected platform inputs; no Windows host or Safari runtime
  claim is made. Cross-platform/browser runtime verification remains Phase 4.
- Known non-failing tooling warnings remain: the shared ESLint/Unicorn peer-version
  conflict and Vite's large initial chunk containing bundled questions/dependencies.

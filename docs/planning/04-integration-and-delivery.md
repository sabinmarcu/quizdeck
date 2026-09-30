# Phase 4 — Integration and delivery

**Status:** planned, not implemented. **Dependencies:**
[Phase 1](01-foundations-and-launch.md), [Phase 2](02-learning-mode.md), and
[Phase 3](03-practice-mode.md).

[Vision and phase index](vision.md)

## Outcome and scope

Verify and finish the complete application as one two-renderer deliverable. This
phase owns integrated platform/lifecycle correctness, accessibility and keyboard
parity, failure recovery, and the actual built application/resource layout. It is
not where missing learning or practice functionality from one renderer is deferred.

Correct defects found here at their owning boundary. Do not weaken transaction,
privacy, timing, or parity requirements to make the verification matrix pass.

## Integrated implementation and review

1. **Build and resource boundaries**
   - Build the real CLI and Vite web application together, with all required
     runtime dependencies and browser resources available in the intended layout.
   - Confirm source and built invocations use the same Clipanion command behavior.
     Built operation must not require `tsx`, a development server, or the checkout
     working directory for locating web assets.
   - Keep browser output free of Node/SQLite APIs. Keep Node-only hosting/path/
     storage/lifecycle code out of shared state/model imports.
   - Preserve `dist/cli` and `dist/web` ownership and correct runtime dependency
     placement. Do not introduce a publication/global-install workflow merely to
     prove the existing repository command surface.
2. **Real failure and recovery boundaries**
   - Exercise storage-open errors, write/transaction aborts, persisted-record
     validation failures, migration failure, occupied web-host port, and missing
     assets. Pending states must clear honestly without false completion or reset.
   - Exercise graceful CLI quit, supported suspension, web blur/hide, navigation
     away, and hard interruption after checkpoints. Verify paused/recovered runs
     use committed answers/time and never count disconnected periods.
   - Exercise concurrent CLI processes and web tabs, including stale projection
     invalidation after a commit, run ownership conflict, and stale-owner recovery.
   - Reopen historical runs after a bank-version change. Preserve old answer
     ordering/content and immutable results; do not relabel IDs or mutate learning
     records as an incidental upgrade.
3. **Accessibility, focus, and parity**
   - Audit the actual learning/list/detail, run/history/question/review, report,
     help, confirmation, loading, and error surfaces in both renderers.
   - Confirm Vim motions, arrows/Enter, contextual help, and keyboard focus follow
     the vision and do not answer by moving focus or escape read-only boundaries.
   - Confirm search/input composition, native web controls, pointer/touch behavior,
     focus restoration, readable long text, and no narrow-layout overflow.
   - Confirm theme token values are initialized and meaningful statuses have text,
     not color-only feedback. Before practice completion, no correctness or
     justifications may leak through styles or accessibility metadata.
   - Verify frontend engine-sensitive styling/lifecycle behavior against the
     supported modern Chromium and Safari/iOS Safari baseline. Record actual
     platforms/versions exercised; do not infer cross-engine proof from Chromium.
4. **Documentation and operational completeness**
   - Update usage for default Ink and separate `web` invocation, build commands,
     fixed origin/port-conflict behavior, shutdown, and local storage locations.
   - Explain separate CLI/browser progress, browser retention limits, global-only
     learning reset, practice-only timing and checkpoint crash precision.
   - Retain the relevant shared instructions and reconcile through the approved
     CLI workflow if implementation changes module applicability.
   - Remove temporary scripts, fixture databases, and debug artifacts. Do not
     commit runtime user data or embed machine-local omnirepo paths in builds.

## CLI and web verification matrix

| Scope | CLI proof | Web proof |
| --- | --- | --- |
| Launch/build | Source and built default commands open Ink; help/invalid commands are non-interactive | Both direct Vite-built hosting and CLI `web` hosting open the same React application |
| Platform storage | Linux/XDG and Windows local-data paths/fallbacks work independently of cwd/executable location | Same-origin reopen preserves IndexedDB; unavailable/denied retention is handled honestly |
| Learning parity | Search, both answer outcomes, reopening, global reset, and no timing | Equivalent visible behavior with native controls, theme, and committed storage |
| Practice parity | Randomized persisted run, immutable previous review, pause/resume, timing, report | Equivalent behavior plus page lifecycle and cross-tab projection refresh |
| Final-answer durability | Answer 60 commits result/time together; restart restores report | Same guarantee after completed IndexedDB transaction and browser reopen |
| Conflict/recovery | Real second process, ownership conflict, interrupted-session recovery | Real second tab, notification/invalidation, ownership conflict, interruption |
| Asset/host lifecycle | `web` resolves only built resources from another cwd; missing assets/port conflicts fail clearly; interruption frees the listener | Stable `127.0.0.1:4173` origin restores browser progress after host restart; SQLite is not exposed |
| Accessibility | Long-text wrapping, focus/input contexts, no phantom fourth choice | Keyboard/touch, visible focus, semantic statuses, narrow layout, supported engine behavior |

## Verification rules

- Run the whole existing Vitest suite and the phase-specific behavioral coverage,
  then typecheck, build both renderers, and run ESLint fixing checks. Fix code rather
  than relaxing shared lint/behavior rules.
- Tests are not the sole exit proof. Launch the actual built CLI in a terminal,
  launch its real `web` command, and interact with the actual browser application.
- Use isolated SQLite directories and browser profiles/origins so verification
  does not modify the developer's real study history. Keep temporary task files
  in the repository's ignored `tmp` area and clean them afterward.
- Preserve regression coverage for plausible consumer-visible failures: atomic
  answers/reset/completion, immutable earlier answers, hidden early feedback,
  deterministic timing, ownership conflicts, and restart recovery. Do not add
  tests for copied wiring, source wording, incidental defaults, or mock echoes.
- Re-exercise affected scenarios after defect corrections. Capture actual terminal,
  browser, stored-record, and command outcomes; clearly identify unavailable host
  verification rather than claiming it passed.

## Exclusions

No cloud synchronization, accounts, transfer/import/export UI, additional study
modes, certification pass threshold, configurable practice size, theme-package
refactor, native single-file executable, or package-publication project. This phase
completes and verifies the agreed app, not a new scope expansion.

## Exit criteria

Every vision acceptance scenario has exercised evidence in both applicable
renderers, with explicit Windows/Linux and supported-browser coverage. Built
commands and web assets operate outside the original working directory. Data
survives required lifecycle transitions, unavailable storage is never hidden,
completed reports are immutable, keyboard/accessibility behavior is coherent, and
CLI-hosted web operation respects the separate IndexedDB/SQLite boundary. All
reachable defects are fixed; missing platform proof is recorded as an unmet gate,
not silently marked successful.

# Phase 4 — Integration and delivery

**Status:** Linux/Chromium integration exercised; native Windows and Safari/iOS
Safari verification gates remain open. **Dependencies:**
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

## Implementation and verification evidence

Runtime evidence below was collected on Linux x86-64, Node.js 26.10.0, Yarn
4.18.1, and Chromium 150.0.7871.24. This records the actual engine version, not
an assertion that other supported engines were exercised.

### Corrections

- SQLite subscribers now watch native `PRAGMA data_version` once per second.
  An external commit refreshes another CLI's question status and recorded feedback
  without a rejected stale answer attempt. The prepared query and unref'd timer
  exist only while subscribed; unsubscribe/close stops monitoring. Native read
  failures notify the owning refresh/error boundary rather than crashing an
  interval callback. Database revisions and ownership still guard every write.
- Web practice renders one contextual error alert instead of announcing the same
  failed save or ownership conflict in both the shell and the practice view.
- Completed CLI reports discard their trailing separator lines, so G/End lands
  on the last explanation rather than an empty viewport in a short terminal.

### Exercised matrix

| Boundary | Observed evidence |
| --- | --- |
| Built delivery | Copied `dist/cli` and `dist/web` into a runtime-dependencies-only installation without `src`, `tsx`, or Vite. Absolute-path Node invocations launched Ink and hosted React from another cwd. A copied-root-only resource was served; withholding only the copied web build produced the actionable missing-assets error and exit 1. |
| Commands and host | Source/built help and invalid commands retained Clipanion behavior; non-TTY Ink failed clearly. The fixed-origin host rejected an occupied port, encoded traversal, absent resources, and POST. SIGINT exited 0 and released the listener; a same-origin restart preserved the entire browser snapshot and reopened its report. |
| CLI invalidation and errors | Two real Ink processes shared isolated XDG SQLite. An answer in one updated the other's detail to read-only feedback. Native open errors, corrupt files, unsupported schema, and an exclusive database lock surfaced storage errors without empty-state replacement or uncaught monitor exceptions. |
| Complete practice | Actual built browser controls completed a randomized 60-question run and displayed all 60 report mappings, selected choices, and explanations. Actual runtime-only Ink controls completed another 60-question run; restarting restored the identical saved run and report. Observed scores were 18/60 in web and 14/60 in CLI; these are smoke results, not a certification pass threshold. |
| Atomic failure/recovery | Native SQLite final-answer trigger failure and native IndexedDB transaction abort retained 59 answers with no report, cleared pending state, and allowed an explicit successful retry. A main-realm native IndexedDB abort in the final built UI kept the current question, showed exactly one alert, and advanced once only after retry. |
| Timing/history | Session-local monotonic clocks exercised 8 active minutes, a two-hour pause, then 12 active minutes: both real stores saved 20 minutes. Reopening against a changed bundled bank retained historical learning feedback, sample IDs, choice ordering, and completed results. Corrupt/newer browser schemas failed without resetting their stored records. |
| Native lifecycle | Direct-Node Ink PTYs stopped on SIGTSTP with paused data and a released cursor; SIGCONT restored active practice, h navigation, and q exit 0. A dedicated headed Chromium instance, with focus emulation disabled, produced genuine hidden/blur and visible/focus transitions: automatic pause/resume, frozen hidden time, and retained manual pause. Navigating away and reopening after lease expiry preserved run ID, order, answers, viewed position, and checkpoint time. |
| Web accessibility | Actual 320px portrait rendering had no horizontal overflow and showed initialized themed focus styling. Learning help/reset dialogs restored invoker focus; reset began on Cancel. Question 140 had three choices, and missing source explanations were explicit. Before answers/completion, DOM/ARIA/choice styling did not disclose withheld feedback. Focus movement did not answer. Loading, unavailable IndexedDB, and best-effort-retention acknowledgment surfaces were exercised. |
| Web concurrency | A second real same-origin tab refreshed its practice history after a commit and rejected simultaneous run ownership with disabled/paused choices and one contextual alert. |
| Narrow CLI | At 12 rows × 40 columns, Ctrl-d reached the end of practice help, gg/G navigated report boundaries, and G retained visible final explanation content. Question 140 rejected a nonexistent fourth choice and recorded choice C at index 2. |

The 67-test Vitest suite, typecheck, ESLint fixing checks, both builds, and immutable
repository install passed. Browser output contained no Node API imports; the
standalone browser launch reported no runtime errors. Existing Vite chunk-size
and shared-ESLint peer warnings remain; no warning suppression was added.

Verification used isolated native databases and temporary runtime installations.
Shared browser-origin records were captured and restored; dedicated sessions were
closed and temporary task artifacts removed.

### Unmet exit gates

- **Native Windows:** no Windows host was available. Linux execution, Windows path
  unit coverage, Wine availability, and a Windows-form Chromium user agent do not
  establish native Windows storage, terminal, or signal behavior.
- **Safari and iOS Safari:** no runtime or configured remote host was available.
  Chromium portrait layout and Chromium lifecycle proof are not Safari proof.

Phase 4 is **not fully closed** until the existing verification matrix is exercised
on those actual platforms and engine versions are recorded. No product requirement
or supported-platform gate has been removed.


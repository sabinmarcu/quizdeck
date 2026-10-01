# Phase 2 — Loading question sets

**Status:** planned. **Dependencies:** [Phase 1](01-identity-and-question-set.md).

[Vision](vision.md) · Previous: [Phase 1 — Quizdeck identity and owned question set](01-identity-and-question-set.md) · Next: [Phase 3 — Distribution and documentation](03-distribution-and-documentation.md)

## Outcome and scope

Users replace the current set with their own JSON file: `yarn cli load <path>` in
the CLI, drag-and-drop or the **Load question set** file picker in the web
application. A load validates the whole file, confirms, and atomically replaces
the set while deleting all learning answers, practice runs, and run ownership.
Other open sessions on the same store switch to the new set cleanly.

## Inputs and decisions

- Follow vision sections 2, 3, 4, 7 (durability), 9, 10, 12.
- Replace-and-reset semantics, plain-array format, independent CLI/web stores,
  load confirmation rules, display-name derivation (vision section 3), and
  `process.cwd()` path resolution are confirmed.
- Phase 1 delivered the single-set store, the demo seed, and `min(60, N)` runs.

## Shared implementation

1. **Parsing and validation**
   - `parseQuestionSet(text, fileName)` in `src/data`: `JSON.parse`, then the
     existing question schema; returns the validated questions, display name,
     and content hash, or a typed failure listing located issues
     (`[12].answers: …`) and JSON syntax errors. Cap the listed issues at a
     readable count with a "+N more" tail.
   - `setDisplayName(fileName)` implements the vision's word-splitting and
     capitalization rules, including the **Untitled Set** fallback. Phase 1's
     hard-coded demo name **Demo Set** must equal `setDisplayName('demoSet')`.
   - No Node or DOM APIs: renderers supply text and file name.
2. **Replacement transaction**
   - Add a `replaceSet` change: writes the new set record (source `file`, load
     time) and deletes every learning answer, run, and owner in the same
     transaction, bumping the revision. Implement in `applyTransaction` and both
     adapters (SQLite: deletes plus upsert inside one transaction; IndexedDB: one
     readwrite transaction over all affected object stores, resolved on
     `complete`).
   - A load ignores live run ownership by design.
3. **State and session handling**
   - A `loadQuestionSet` write atom goes through the existing commit path: pending
     indicator, single in-flight write, publish only after commit, error kept in
     `actionErrorAtom` with the old projection retained.
   - Before committing from a session that has an active practice run, stop its
     timer without persisting a checkpoint for a run that is about to be deleted.
   - After any refresh (own commit, `BroadcastChannel`, SQLite `data_version`),
     the practice controller treats a vanished active run as a terminated run:
     stop timing, drop ownership state, return the view to history, and surface a
     "question set was replaced" notice. Heartbeats for a vanished run are no-ops,
     never recreating the run or entering the storage-error state.
   - Learning UI state (query, filter, focused row, open detail) resets when the
     set's content hash or load time changes.
4. **Tests**
   - Parser: located errors for duplicate IDs, zero/two correct answers, blank
     text, unknown properties, non-array roots, malformed JSON.
   - Display names: each vision example row, separators, digits, uppercase runs,
     a `.JSON` extension, directory stripping, and the empty fallback.
   - Replacement against real SQLite and the shared `applyTransaction`: all
     learning/runs/owners removed, revision bumped; a failed transaction leaves
     the previous set and progress intact.
   - Practice controller: a run deleted by another session's load stops timing
     and does not resurrect on the next checkpoint.

## CLI delivery

- New Clipanion `LoadCommand` at path `['load']` with a required positional
  `path` and a `--yes` boolean. Register it in `main.tsx`; `yarn cli load <path>`
  and `yarn start:cli load <path>` work through the existing scripts.
- Resolve a relative `path` against `process.cwd()`; no package-manager
  environment variables are consulted.
- Flow: read the file (UTF-8) -> parse/validate -> open SQLite at the platform
  path -> if learning answers or runs exist, confirm interactively on a TTY
  (summarising the set name and question count to load, and the counts to be
  erased), skip with `--yes`, fail without changes on a non-TTY without `--yes`
  -> commit `replaceSet` -> print the loaded name, question count, and cleared
  counts -> close storage, exit 0.
- Every failure (missing/unreadable file, invalid JSON, schema issues, declined
  confirmation, busy/locked database beyond the existing timeout, storage error)
  exits non-zero with a Clipanion usage-style message, no stack trace.
- `load` never constructs Ink or the web host; `web` still never opens SQLite.
- Ink Overview lists the `load` command for replacing the set. A concurrently
  open Ink session picks the load up through `data_version` monitoring and
  follows the shared vanished-run/reset rules.

## Web delivery

- **File picker:** a **Load question set** control in Extras -> Overview, built on
  a native `<input type="file" accept=".json,application/json">` with a visible,
  focusable label/button.
- **Drag-and-drop:** once startup is ready, window-level `dragenter`/`dragover`/
  `drop` handlers accept file drags anywhere, show a full-window overlay
  ("Drop a question set JSON to replace the current set"), and prevent the
  browser's default file navigation. Reject multiple files and non-file drags with
  a message. While storage is loading or failed, drops are prevented and explained
  rather than navigating away.
- Read with `File.text()`, then the shared parser. Validation errors render in an
  alert region listing located issues; nothing is written.
- Valid files open a native `<dialog>` confirmation (reuse the learning-reset
  dialog pattern in `Learning.Dialogs.tsx`) naming the set, its question count,
  and that all learning progress and every practice run will be deleted. Cancel
  changes nothing; confirm commits, closes the dialog, returns to Learn, and
  announces success via a status region.
- Other tabs on the same origin refresh through `BroadcastChannel` and follow the
  shared vanished-run/reset rules.
- Style the overlay and control with colocated Vanilla Extract and theme tokens;
  the overlay conveys state with text, not color alone.

## Exclusions

No merging, appending, multiple stored sets, set switching, export, URL/remote
loading, in-app editing, demo restoration, or CLI-to-web transfer. The CLI web
host gains no upload endpoint.

## Verification

- CLI: with an isolated data directory, `yarn cli load sets/questions.json`
  replaces the demo; Ink shows the new set; a second `load` after answering
  questions and starting a run prompts, and `--yes` skips the prompt; piping
  through a non-TTY without `--yes` fails with no change. Invalid files (bad JSON,
  duplicate IDs, two correct answers) print located errors and exit non-zero with
  the previous set intact. A relative path resolves against the working directory.
- CLI concurrency: keep Ink open in a practice run, run `load --yes` in another
  terminal; the Ink session returns to history with the replaced-set notice, the
  timer stops, and no deleted run reappears.
- Web (built app via `yarn cli web`, real browser): drop the file anywhere, see
  the overlay, confirm, and observe the new set; cancel leaves everything intact;
  dropping two files or an invalid file shows errors; the file picker works by
  keyboard only; screen-reader-visible status/alert text is present. With two
  tabs, one mid-practice, a load in the other moves the first back to history.
- Load a set with a five-choice question in both interfaces; label and answer the
  fifth choice through focus and Enter/click.
- Load a set of 61+ questions and confirm 60-question runs; load a three-question
  set and confirm three-question runs.
- Confirm a CLI load does not alter the browser store and vice versa.
- Run `yarn test`, `yarn typecheck`, `yarn lint`, and `yarn build`.

## Exit criteria

Both interfaces load valid files with confirmation, reject invalid files without
side effects, and atomically replace the set while clearing all progress. Open
sessions on the same store adapt without errors, resurrected runs, or
double-counted time. The README documents the file format, `load` usage, web
loading, and per-interface store independence.

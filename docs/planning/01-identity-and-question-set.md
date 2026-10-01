# Phase 1 — Quizdeck identity and owned question set

**Status:** implemented. **Dependencies:** none.

[Vision](vision.md) · Next: [Phase 2 — Loading question sets](02-loading-question-sets.md)

## Outcome and scope

Both applications are branded **Quizdeck**, store data under `quizdeck`
locations, no longer bundle the former question bank, and start on a bundled
three-question demo set persisted in their own store. Practice works on any set
size with `L = min(60, N)` questions. Learning, practice, timing, history, and
reports behave exactly as before otherwise.

This phase does not add loading. After it, the only set a fresh store can hold
is the demo; Phase 2 adds replacement. That is a complete, working intermediate
state, not a stub: no disabled **Load** control or placeholder `load` command is
added here.

The rebrand and the storage-layout change ship together so that no `quizdeck`
store is ever created with the old multi-bank layout and no migration is needed.

## Inputs and decisions

- Follow vision sections 1, 3 (format and demo), 6, 7, 10, 12, 13.
- Name **Quizdeck**, slug `quizdeck`; confirmed.
- Stores under the previous identifier (identical to the repository folder name)
  are not read, migrated, or deleted; confirmed.
- Practice length `min(60, N)`; confirmed.
- File format stays the existing plain array and the existing Zod question
  schema; confirmed.
- The former `src/questions.json` moves to a gitignored local directory; confirmed.
  It currently carries uncommitted working-tree edits that must survive the move.

## Shared implementation

1. **Rebrand tracked sources**
   - `package.json` `name` -> `quizdeck`; refresh `yarn.lock`'s workspace entry
     through `yarn install`, not by hand.
   - Clipanion `binaryName` -> `quizdeck`; command usage descriptions, Ink header,
     web `<title>`, meta description, and every web `<h1>` -> Quizdeck wording.
   - Remove the previous product name and the exam-specific framing from product
     copy; describe the app as a question-set study tool.
2. **Relocate the former bank file**
   - Add `/sets/` to `.gitignore`. Move the working-tree `src/questions.json`
     (with its uncommitted edits) to `sets/questions.json`, then remove it from
     the index. Do not `git checkout`/`git rm` the file in a way that discards
     the working-tree edits.
   - Remove the JSON import from `src/data/bank.ts` and `loadBundledBank()`.
3. **Demo set**
   - Add a shared module (for example `src/data/demo.ts`) exporting three generic
     questions as typed source, validated through the same schema at startup.
     Include one three-choice question. Content is generic (for example, how
     Quizdeck works), not subject material. Its display name is **Demo Set**.
4. **Single persisted set**
   - Replace the bank catalog with one current-set record: questions plus
     display name, source (`demo` | `file`), load time, content hash, and
     question count. Remove `banks` from `Snapshot`, the `putBank` change,
     `ProgressStorage.getBank`, `loadSavedBanks`, the `banks` map in `Startup`,
     and `bankVersion` on learning answers and runs. Clean cutover; no aliases.
   - Add a `seedSet` (or equivalent) change that succeeds only when the store holds
     no set. Startup seeds the demo when the store is empty, tolerating a
     concurrent seeder by re-reading on conflict, as the current `putBank` path
     does. A store that already has a set is never re-seeded.
   - Snapshot validation checks every learning answer and run question ID against
     the current set; mismatches are persisted-data errors.
5. **Variable practice length**
   - Remove the fixed `practiceQuestionCount` constant. `samplePracticeQuestions`
     draws `min(60, N)` IDs; the run's `questionIds.length` is `L`.
   - Run schema: `1 <= questionIds.length <= 60`, distinct; `answers.length <= L`;
     `nextUnanswered <= L`; `viewedPosition <= L - 1`; completed iff
     `nextUnanswered === L`; `result.correctCount <= L`;
     `percentage = correctCount / L * 100`.
   - `answerPracticeRun`, `practiceReport`, the practice controller's position
     validation (`max(59)` today), and view projections derive bounds from the run.
6. **Tests**
   - Replace every use of the bundled 175-question bank in specs
     (`sqlite.spec.ts`, `learning.spec.ts`, `practice.spec.ts`, and others) with
     generated fixtures, following the existing `records.spec.ts` generator style.
   - Delete assertions that pin the old bank (for example `total: 175`).
   - Cover the new boundaries that consumers would notice: `L` for `N < 60`,
     `N = 60`, `N > 60`; completion at `L`; percentage over `L`; seed-only-when-empty
     and concurrent seeding; rejection of records whose IDs are absent from the set.

## CLI delivery

- `path.ts` resolves `.../quizdeck/progress.sqlite` on Linux/Unix and Windows;
  update `path.spec.ts` expectations.
- SQLite schema version 1 is the single-set layout (current-set table or metadata
  row replaces `progress_banks`). The transaction path stores and validates the
  set like other payloads.
- Ink Overview shows the set's display name, demo/file source, load time, and
  counts. Practice copy replaces every literal `60` (`/60 answered`, `Score x/60`,
  "60-question run") with the run's `L` or, before a run exists, the current set's
  `min(60, N)`.

## Web delivery

- IndexedDB database `quizdeck`; `BroadcastChannel` prefix `quizdeck-progress:`.
  Version 1 object stores hold the single-set layout; remove the `banks` store.
- Overview shows the same set information as the CLI. Practice copy
  ("Complete 60 questions…", "of 60 answered") uses `L`.
- The Vite web bundle no longer contains question content beyond the demo.

## Exclusions

No loading command, drop zone, or file picker (Phase 2). No migration from
previous-identifier stores. No configurable practice size, set title field, or
alternate file formats. No changes to the omnirepo theme packages.

## Verification

- Fresh CLI: run `yarn cli` with an isolated `XDG_DATA_HOME`; observe Quizdeck
  branding, the demo set in Overview and Learn, a three-question practice run
  through to its report, and `quizdeck/progress.sqlite` created at the new path.
- Fresh web: `yarn build` then `yarn cli web`; in a real browser at the fixed
  origin, observe Quizdeck branding, a new `quizdeck` IndexedDB with the demo set,
  and a complete three-question practice run.
- Confirm the previous-identifier SQLite file and IndexedDB database are
  untouched after launching.
- Restart both applications mid-run; resume and complete with correct `L` bounds.
- Run `yarn test`, `yarn typecheck`, `yarn lint`, and `yarn build`.

Verified on Linux with the pinned toolchain: 71 tests, typecheck, lint fixes, and
both production builds pass. Real Ink and Chromium sessions show Demo Set,
complete three-question practice reports, and resume the same run after a mid-run
restart. The isolated previous-identifier SQLite file and existing browser
database remained unchanged. The relocated question file retains its original
working-tree bytes. Native Windows and Safari/iOS Safari verification is waived.

## Exit criteria

Both interfaces launch as Quizdeck at `quizdeck` storage locations, start on the
persisted demo set, and complete practice runs of `min(60, N)` questions. No
question bank is bundled or imported besides the demo; `sets/questions.json` is
untracked and retains the user's edits. Tests run on generated fixtures.
README sections touched by these changes (title, storage table, question-bank
section) reflect the new behavior.

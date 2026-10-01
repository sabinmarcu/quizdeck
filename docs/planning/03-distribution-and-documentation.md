# Phase 3 — Distribution and documentation

**Status:** implemented. **Dependencies:** [Phase 1](01-identity-and-question-set.md)
and [Phase 2](02-loading-question-sets.md).

[Vision](vision.md) · Previous: [Phase 2 — Loading question sets](02-loading-question-sets.md)

## Outcome and scope

`quizdeck` is runnable outside Yarn scripts through a `package.json` `bin` entry
and bash, Command Prompt, and PowerShell launchers. The README documents the
finished product, and no former branding remains in tracked files.

## Inputs and decisions

- Follow vision sections 4 (CLI surface, launchers and `bin`), 7, 12.
- The `bin` target is a Node script, mirroring Yarn's own package layout
  (`bin: { yarn: "bin/yarn.js" }` beside `bin/yarn`, `bin/yarn.cmd`,
  `bin/yarn.ps1`): package managers run or shim `bin` targets with Node, so a
  shell script target would break `yarn run quizdeck` and npm's generated shims.
- Yarn resolves workspace scripts and dependency binaries. An explicit `quizdeck`
  package script invokes the Node entry so `yarn run quizdeck` works in this private
  workspace; the `bin` field remains the executable contract for package consumers.
- Runtime support is declared as Node.js `>=26.10.0`, matching the verified minimum.
- The repository folder name is the only permitted branding exception.
- Registry publication stays out of scope.

## Shared implementation

1. **`bin` entry and launchers**
   - `bin/quizdeck.js`: `#!/usr/bin/env node`; dynamically imports
     `../dist/cli/main.js`, then sets `process.exitCode = await runCli()`. If the
     build is missing (`ERR_MODULE_NOT_FOUND` for that file), print
     "Quizdeck is not built. Run `yarn build` in <repo>." and exit 1. Other
     errors propagate.
   - `bin/quizdeck` (bash): `set -euo pipefail`; resolve the script's real
     directory through symlinks without relying on GNU-only `readlink -f`; fail
     with a clear message when `node` is not on `PATH`; then
     `exec node "$dir/quizdeck.js" "$@"`.
   - `bin/quizdeck.cmd`: `@echo off`, `setlocal`, check `where node`, then
     `node "%~dp0quizdeck.js" %*` and `exit /b %ERRORLEVEL%`.
   - `bin/quizdeck.ps1`: `$ErrorActionPreference = 'Stop'`; check
     `Get-Command node`; `& node (Join-Path $PSScriptRoot 'quizdeck.js') @args`;
     `exit $LASTEXITCODE`.
   - `package.json`: `"bin": { "quizdeck": "bin/quizdeck.js" }`.
     Also define `scripts.quizdeck` as `node bin/quizdeck.js` for local Yarn use.
   - `.gitattributes`: `bin/quizdeck text eol=lf`, `bin/quizdeck.cmd text eol=crlf`;
     `.editorconfig`: `[*.cmd] end_of_line = crlf`. Commit `bin/quizdeck` and
     `bin/quizdeck.js` with the executable bit (`git update-index --chmod=+x`).
   - Lint `bin/quizdeck.js` with the existing ESLint configuration (extend the
     `lint` globs to include `bin`).
2. **Documentation**
   - README: Quizdeck title and description; `yarn cli`/`yarn start:cli`, the
     `quizdeck` bin entry, and the launchers (including adding `bin/` to `PATH`
     on each shell); `load` usage with `process.cwd()` path resolution and
     `--yes`; the file format and validation rules; display-name derivation;
     demo-first startup; replace-and-reset semantics; web drag-and-drop and file
     picker; storage table with `quizdeck` paths; CLI/web store independence; the
     note that previous-identifier stores are left untouched.
   - Remove README statements about the bundled 175-question bank, the fixed
     60-question run, the bundled-questions chunk-size note, and outdated phase
     status.
3. **Branding audit**
   - `git grep -niE 'cl[a]ude|anthrop[i]c|certif[i]cation'` over tracked files
     returns nothing (the bracketed classes keep this line from matching itself).
     Gitignored local data such as `sets/` and `/tmp/` is user-owned and outside
     the audit.

## Exclusions

No new product behavior, registry publication, global-install automation,
installer, or automatic browser opening. No cross-platform or cross-browser
acceptance-scenario runs.

## Verification

- `yarn build`, then from a directory outside the repository:
  - `<repo>/bin/quizdeck --help`, `load ./relative.json --yes`, and an invalid
    file: help output, a load resolved against that directory, and a non-zero
    exit status for the invalid file (`echo $?`).
  - Invoke `bin/quizdeck` through a symlink placed elsewhere on `PATH`.
  - `node <repo>/bin/quizdeck.js --help` and `yarn run quizdeck --help` from the
    repository.
- Remove `dist/cli` and confirm every launcher prints the build hint and exits 1.
- Native Windows and Safari/iOS Safari verification is waived; launcher behavior
  and platform support requirements are unchanged.
- Run the branding audit, `yarn test`, `yarn typecheck`, `yarn lint`, and
  `yarn build`.

Verified on Linux with the pinned toolchain: 109 tests, typecheck, lint fixes, both
production builds, Bash syntax, and Node entry syntax pass. Actual launchers were
run from outside the checkout for help, a spaced relative file path, invalid-file
exit status, and the default Ink interface. A relative symlink chain on `PATH`
preserved caller path resolution. Missing Node and a temporarily unavailable build
produced the expected stderr diagnostics and exit 1; the original build was restored.
An unrelated missing dependency propagated instead of receiving the build hint.
The occupied-port `web` failure was exercised; the existing server was left running.
The tracked-file branding audit is clean. Approved AI-stack reconciliation is current.
Native Windows and Safari/iOS Safari verification remains waived.

## Exit criteria

The `bin` entry and all three launchers forward arguments, preserve the working
directory, propagate exit status, and explain a missing build. README and vision
agree with the shipped behavior, and the branding audit is clean.

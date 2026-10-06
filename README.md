# Quizdeck

Generic question-set study tool built with React + TypeScript, React DOM/Vite,
and an Ink terminal interface. Both interfaces start with a persisted three-question
**Demo Set** and support learning, practice, timing, history, reports, and loading
replacement JSON sets and standalone launchers. Native Windows and Safari/iOS Safari
verification is waived.

[Product mission](docs/vision.md)

## Development and launch

Development Node.js **24.18.0** and Yarn **4.18.1** are pinned in `.prototools`.
This repository deliberately keeps toolchain requirements out of `package.json`:
neither `engines` nor `devEngines` is published. The packaged CLI is verified on
**Node.js 24.x**. Yarn uses the `node-modules` linker; project commands and dependency
management use Yarn/Proto, never Corepack.
The package is **`@sabinmarcu/quizdeck`**, licensed MIT, and exposes the `quizdeck`
executable rather than a public library API.

```sh
proto install
yarn install
yarn prepare         # Enable local Git hooks; Yarn 4 does not run prepare on install
yarn cli             # Default Clipanion command: interactive Ink; requires a TTY
yarn cli --help
yarn dev:web         # Vite development/HMR server
yarn build           # Typecheck and build both renderers
yarn start:cli       # Run the built Ink interface
yarn start:cli web   # Serve the built web application
yarn run quizdeck --help  # Built Node entry exposed through the package script
```

Set `VITE_ALLOWED_HOSTS` to a comma-separated list of domains to allow additional
hosts through Vite's development server host check:

```sh
VITE_ALLOWED_HOSTS=quizdeck.example.com,study.example.com yarn dev:web
```

The variable can also be set in Vite's mode-specific `.env` files. Zod parses it
when the configuration loads, trimming whitespace and ignoring empty entries.
An unset or empty value preserves Vite's default host restrictions; localhost
and IP addresses remain allowed. Use hostnames without URL schemes or ports.
This setting does not change the server's bind address or configure the built
CLI's `web` server.

For development access from another device on your LAN, also set the bind address:

```sh
VITE_ALLOWED_HOSTS=devbox.router.local yarn dev:web --host 0.0.0.0
```

Plain HTTP on a LAN hostname or IP address supports startup, question-set imports,
and practice. Session/run IDs use `crypto.getRandomValues()`, and content hashes
use portable SHA-256 rather than secure-context-only browser APIs. Existing saved
hashes and runs remain compatible. Progress is separate for each browser origin;
HTTP may show the existing best-effort storage retention warning.

`yarn dev:cli` also launches the source Ink command. `yarn cli web` serves the same
built web application; it does not start Vite or build missing assets. Run
`yarn build` first. The built CLI keeps dependencies external, so it requires the
installed runtime dependencies and the sibling `dist/web` build.

The `web` command stays in the foreground at **http://127.0.0.1:4173** and prints
that URL. Open it in a browser; Ctrl-C stops the host. An occupied port fails
without choosing a different origin. Web assets resolve relative to the application
installation, not the caller's current directory. Only built assets are served;
source files and the SQLite database are not web endpoints.

## Standalone launchers

After `yarn install` and `yarn build`, the launchers can run outside the checkout.
They forward arguments unchanged, preserve the caller's working directory, and
propagate the CLI's exit status. Relative `load` paths therefore resolve against
that caller directory. Installed runtime dependencies and both build directories
must remain available beside the launchers.

| Entry | Purpose |
| --- | --- |
| `bin/quizdeck.js` | Executable Node ESM bootstrap; target of the package `bin` entry |
| `bin/quizdeck` | Bash launcher; follows absolute or relative symlink chains |
| `bin/quizdeck.cmd` | Command Prompt launcher, checked out with CRLF line endings |
| `bin/quizdeck.ps1` | PowerShell launcher |

### Bash / Unix

```sh
export PATH="/path/to/quizdeck/bin:$PATH"
quizdeck --help
quizdeck load ./questions.json --yes
quizdeck web
```

### Command Prompt

```bat
set "PATH=C:\path\to\quizdeck\bin;%PATH%"
quizdeck.cmd --help
quizdeck.cmd load .\questions.json --yes
```

### PowerShell

```powershell
$env:Path = "C:\path\to\quizdeck\bin;$env:Path"
quizdeck.ps1 --help
quizdeck.ps1 load .\questions.json --yes
```

The Node entry also works directly with `node /path/to/quizdeck/bin/quizdeck.js`.
From the checkout, `yarn run quizdeck` invokes that same entry through a package
script. The local launchers do not install globally or change execution policies.
Registry publication is handled separately by the gated release workflow below.

The shell launchers report a missing `node` clearly. When `dist/cli/main.js` is
missing, the Node entry writes a build hint to stderr and exits 1; other import
failures are not disguised as a missing build. The launchers use the built CLI,
not a development server or an alternate argument parser.


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

Extras → Overview reports the current set's name, demo/file source, load time,
question/answer counts, and saved-record counts. Extras → Storage shows the backend,
location, retention, revision, and content hash.
Opening a menu does not answer a question, infer learning completion, or start a practice timer.

## Learning mode

Open **Learn** in either interface. Search by source question number or description,
and filter All, Unanswered, Completed, Correctly answered, or Incorrectly answered.
Completed/total counts remain independent of the current search results.

In the web learning list, **Resume learning** opens the lowest-numbered unanswered
question in the loaded set, independently of the current search, status filter,
or list page. It leaves search and filter values unchanged and reuses the existing
question navigation and back-to-list behavior. The button is disabled when every
question is answered and becomes available again after resetting learning progress.

Web Learn lists show 25 questions per page by default. **First page**, **Previous
page**, **Next page**, and **Last page** navigate the filtered results. On wide
screens, first/previous and next/last form tall sticky rails in the outer gutters,
without reducing the Learn card's width. Narrow layouts use a touch-sized row
above the results. The **Page number** input is centered and the page/result
summary is right-aligned; narrow layouts stack these controls without overflow.
Enter a whole page number and press Enter or leave the field to jump. Invalid
values keep the current page; Escape restores its number. Empty results disable
the page input and all four navigation buttons.

**Items per page** accepts positive whole numbers; invalid input keeps the last
valid page size. When a size change or filtering reduces the page count, the
current page and page-number input clamp to the last available page. For example,
page 4 of 175 questions at 25 per page becomes page 2 at 100 per page. List keyboard
shortcuts stay within the visible page; returning from detail shows and focuses
the current question's page. Pagination does not apply to Practice or the CLI.

Web question cards fill the content container. Question previous/next controls
share the learning-list button styling, with arrows centered on both axes. Wide
layouts use tall sticky controls in the outer gutters; narrower layouts use a
touch-sized navigation row below the card.
**Back to list**, **Keyboard help**, and **Reset all learning progress** sit below
the card/navigation and above the question-set loading footer.
Saved web learning question cards use pronounced green or red backgrounds and
matching 2px borders for correct or incorrect outcomes. Unanswered cards remain neutral;
status labels and individual answer-choice feedback remain visible alongside color.

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


The global reset requires confirmation, defaults to Cancel, and clears only
learning answers/statuses after a successful transaction. The current question set,
practice records, and their timing are untouched. Failed saves leave prior committed
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

Query, filter, and preferred list row are retained within the application session
until a set load resets them. Permanent answer/status records survive application
restarts; loading a set clears them along with every practice run.

## Practice mode

Open **Practice** and start a new run or resume/review an existing one. Each new
run saves a randomized order of **min(60, N) distinct questions**, where N is the
current set's question count. The demo yields a three-question run. Runs are
independent; starting another does not replace history.

Practice also shuffles answer choices in both interfaces. The run and question
identities determine a stable display order across review, pause/resume, reload,
and completed reports. Choice shortcuts refer to that displayed order, while
saved answers retain their original dataset indices for scoring. Learning keeps
the source answer order; existing saved progress requires no schema migration.

Activate an answer once with a choice button, Enter, or a–d/1–4. A successful
transaction records the answer and advances to the next unanswered question.
Earlier questions can be inspected with h/l or previous/next controls, showing
the recorded choice read-only. Future questions cannot be skipped, and neither
correctness, explanations, a running score, nor dataset-ID mapping is shown early.

The final answer commits completion and opens the saved report immediately. Reports
contain every question in the run's practice order, the **practice position → dataset ID**
mapping, correct count out of the run length, percentage, selected/correct choices,
outcomes, and source explanations. Correct
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
| CLI, Linux/Unix | Native `node:sqlite` | Absolute `$XDG_DATA_HOME/quizdeck/progress.sqlite`, otherwise `~/.local/share/quizdeck/progress.sqlite` |
| CLI, Windows | Native `node:sqlite` | Absolute `%LOCALAPPDATA%\quizdeck\progress.sqlite`, otherwise `AppData\Local\quizdeck\progress.sqlite` beneath the user's home directory |
| Web | Native IndexedDB | Database `quizdeck` in the current browser profile and origin |

The stores are independent. Running the CLI's `web` command does not open SQLite
or share CLI progress with the browser. A Vite development origin and the fixed
production origin have different browser databases.

Zod validates the current question set and persisted records. Each store owns one
set with its name, source, load time, question count, and SHA-256 content hash.
Startup seeds the demo only when no set exists; concurrent first launches converge
on the committed seed. Learning answers and practice question IDs must belong to
that set. Revision conflicts and timing ownership protect current workflows;
unsupported or corrupt data is reported, never automatically reset. Quizdeck's
single-set storage schema is version 1. Previous-identifier stores are not read,
migrated, or deleted.

Each application instance owns a Jotai store backed by its platform adapter.
Startup loads validated persisted state before enabling interaction. Transactions
commit coupled changes before publishing atom projections; failed writes do not
acknowledge progress. Browser post-commit notifications reload projections across
tabs but do not grant writer ownership.
SQLite observes native database changes once per second while a UI subscribes,
refreshing another CLI's committed projection without granting writer ownership.
When another session replaces the set, open learning context resets and a deleted
practice run returns to history with a notice. Its timer stops; later checkpoints
never recreate it. Repeated loads of identical content still reset all progress.

Browser persistent retention is requested. Denied or unavailable retention means
best-effort storage, not an in-memory fallback. Site-data clearing, private-session
teardown, or browser eviction can still remove browser progress. Unavailable storage
is an explicit startup error. SQLite files can likewise be deleted or lost.

## Question set

Only three generic demo questions are bundled, as typed source in `src/data/demo.ts`.
The demo includes a three-choice question. Its name is **Demo Set** and its source
is `demo`. Each application persists its own copy on first launch; existing sets
are never automatically replaced with the demo.

Question arrays retain source IDs, wording, and answer order. Learning lists them
by ascending ID. Every question has at least two choices and exactly one correct
answer; blank justifications are shown as missing from the source.
Files are UTF-8 JSON plain arrays, not objects containing a title or questions field.
IDs must be unique positive safe integers. Descriptions and choice text must be
non-blank strings; justifications are strings and may be empty. Additional
properties are rejected at every level. A failed file is rejected as a whole with
located errors (for example, `[1].id`), never partially imported.

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

The former question bank is preserved locally at gitignored `sets/questions.json`
and is no longer tracked, imported, or bundled. It can be loaded like any other
set. Tests use generated fixtures rather than subject content.

## Loading question sets

### CLI

```sh
yarn cli load sets/questions.json
yarn cli load ./networkBasics.json --yes
yarn start:cli load ./networkBasics.json --yes
quizdeck load ./networkBasics.json --yes
```

Relative paths resolve against the process working directory. Files are read and
validated before storage is opened. If there are no saved learning answers or
practice runs, a valid file loads without a prompt. Otherwise, an interactive
terminal asks for confirmation and defaults to Cancel; `--yes` skips that prompt.
A non-TTY invocation with saved progress requires `--yes`. Cancellation and errors
exit non-zero without changing the current set or progress; errors are usage-style
messages without stack traces. Successful loads report the name, question count,
and cleared learning/run counts, then exit without launching either interface.

### Web

Drop one JSON file anywhere on the ready application, or use **Load question set**
in the footer on Learn, Practice, and every Extras page. Drag-and-drop guidance
appears above the touch-friendly outlined button, which opens the native file
picker; the picker and confirmation are keyboard operable.
Valid files always open a confirmation naming the incoming set and
explaining that every learning answer and practice run will be deleted. Cancel
leaves the store unchanged; confirmation commits and returns to Learn. Success
appears as a native top-right toast with a polite announcement and disappears
after five seconds without moving focus. Its pop-in animation respects reduced
motion. Multiple-file, non-file, invalid, and pre-ready drops show errors instead
of navigating away. Validation issues are exposed in an alert region.

### Replacement and naming

Loading atomically replaces the set and deletes all learning answers, unfinished
and completed practice runs, timing records, and run ownership. Live ownership
does not block an explicit load. There is no merge, append, deduplication, or
automatic demo restoration. A failed transaction leaves the old set and progress
intact. Each interface loads only into its own store; CLI loading does not change
the browser, and browser loading does not change the CLI.

Names come from the file's base name: remove `.json` case-insensitively, split
separators and camelCase/acronym boundaries, capitalize each word's first character,
and preserve its remaining characters. For example, `networkBasics.json` becomes
**Network Basics**, and `awsIAMRoles.json` becomes **Aws IAM Roles**. An empty name
becomes **Untitled Set**. Overview shows the name, file source, load time, and counts.

## npm publication and semantic releases

The release setup mirrors `mods` and `foreverwinter-mods`: Conventional Commits on
`master` determine semantic versions, `CHANGELOG.md` is generated, npm receives the
package, and GitHub receives a tag/release. Generated manifest, lockfile, and
changelog updates are committed as `chore(release): VERSION [skip ci]`.

### Artifact and consumer checks

`yarn pack` builds both interfaces, includes `bin/`, `dist/cli/`, and `dist/web/`,
and excludes source, local sets, caches, `.prototools`, and repository/AI configuration.
There are no `preinstall`, `install`, or `postinstall` scripts. Husky uses `prepare`,
which npm does not run when installing a registry package or its tarball; Yarn 4
contributors run `yarn prepare` manually. Packing does not rewrite the manifest,
and no `pinst` dependency or hook restoration is needed. Consumers do not need
Husky, TypeScript, Vite, or semantic-release to install and run the CLI.

```sh
yarn lint:fix
yarn typecheck
yarn test
yarn pack:verify /absolute/path/to/node24
```

The last command packs the real artifact, installs it in an isolated Yarn consumer
with install scripts enabled, checks Node compatibility, invokes its installed
binary, and inspects persisted SQLite data. It also checks built web assets and
starts the fixed-origin host when port 4173 is free; an existing listener is never
killed or replaced. Temporary files are removed. CI obtains a Node 24 executable
automatically, while project/release tooling uses the pinned development runtime.

### One-time human bootstrap

The package starts at **`0.0.0-development`**. First commit/push the release
configuration so `.github/workflows/release.yml` exists on GitHub. The publication
job stays disabled until the `NPM_TRUSTED_PUBLISHING` repository variable is `true`.
From the validated checkout, authenticate and publish the real working seed:

```sh
yarn npm login --scope sabinmarcu --publish --web-login
yarn npm publish --access public --tag bootstrap
yarn npm info @sabinmarcu/quizdeck@0.0.0-development --json
```

Complete authentication and 2FA locally; never share tokens or OTPs. Do not manually
publish `1.0.0`: the existing Conventional Commit history produces that version as
the first semantic-release production release, and registry versions are immutable.
The seed uses `bootstrap`, not the intended production channel. npm may initialize
`latest` to the sole seed version; the first automated production release replaces it.

This is a conventional bootstrap path, not a requirement to ship an empty boilerplate.
Current [staged publishing](https://docs.npmjs.com/staged-publishing/) can also create
a new package with npm's `0.0.0-stage` placeholder. That alternative still needs human
authentication/approval and is distinct from this direct semantic-release pipeline.

### Configure the npm trusted publisher

After the package exists, open its npm **Settings → Trusted publishing**, choose
GitHub Actions, and set these exact values:

| Setting | Value |
| --- | --- |
| Organization/user | `sabinmarcu` |
| Repository | `quizdeck` |
| Workflow filename | `release.yml` — not the full path |
| GitHub environment | None |
| Allowed action | **Allow direct publishing with npm publish** |

New trusted publishers default to staged publishing; explicitly allow direct
publishing because `@semantic-release/npm` invokes the direct publisher. Hosted
GitHub runners, `id-token: write`, and a supported npm implementation are required.
The installed plugin bundles a compatible npm implementation. Trusted publication
automatically generates provenance for this public repository/public package.

Only then enable and trigger publication:

```sh
gh variable set NPM_TRUSTED_PUBLISHING --repo sabinmarcu/quizdeck --body true
gh workflow run release.yml --repo sabinmarcu/quizdeck --ref master
gh run list --repo sabinmarcu/quizdeck --workflow release.yml --branch master
```

Subsequent pushes to `master` release automatically when quality and packed-consumer
checks pass and commits warrant a version. PRs/forks cannot publish. Only the release
job receives write/OIDC permissions; full history and tags are checked out. Branch
protection must permit the configured release commit/tag push. No `NPM_TOKEN` or
`NODE_AUTH_TOKEN` is supplied by this workflow.

The semantic-release npm plugin invokes its bundled npm internally for versioning
and publication, matching the other repositories. This is the narrow publication
implementation exception, not a package-manager change: repository commands remain
Yarn. Publication needs no `NPM_CONFIG_FORCE` override because repository-only
toolchain pins live in `.prototools`, not the published manifest.

### Prove the first release, then harden access

Confirm an actual workflow succeeds, the logs show npm OIDC authentication/token
exchange, `v1.0.0` and a GitHub release exist, and the registry exposes the expected
version with `latest` and a provenance attestation. A local dry-run only validates
configuration/version analysis; it does not prove OIDC or publish anything.
After that proof, select **Require two-factor authentication and disallow tokens**
in npm publishing access and revoke any temporary publish tokens. Trusted publishers
continue to work under that restriction.

Sources: [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/),
[semantic-release GitHub Actions](https://semantic-release.org/recipes/ci-configurations/github-actions/),
[npm lifecycle scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts/#life-cycle-scripts),
and [Husky manual setup](https://typicode.github.io/husky/how-to.html#manual-setup).


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

Web styles use Vanilla Extract, `@sabinmarcu/theme` 1.3.0, and
`@sabinmarcu/theme-core` 1.0.0. `src/web/theme.ts` owns the source inputs and extends
the shared contract with static breakpoints. Existing palette inputs, spacing,
typography, and learning controls are retained; derived colors use native CSS.

Vite emits the `quizdeck-theme` stylesheet and version-2
`script[type="application/json"][data-theme-manifests]` metadata into the HTML head
for both development and production. Styles are available before application
JavaScript runs. The page consumes those allocations directly, without a redundant
browser theme remount or value cache. Optional external devtools discover and edit
the actual owned stylesheet; no inspector UI is added to Quizdeck. Static
breakpoints and derived tokens are read-only. Native CSS requires current Chromium
and Safari 26+; native Safari/iOS verification remains waived as noted above.

The root `package.json` narrowly resolves
`@sabinmarcu/theme-core@npm:1.0.0/@sabinmarcu/stylesheet` to `1.1.0`, replacing core's
incompatible `1.0.3` pin without overriding other consumers. Remove this override
when upgrading to a core release with a compatible upstream pin. `.yarnrc.yml`
preapproves only these three exact migration releases for the existing package
gates; the global gates remain enabled. `yarn why @sabinmarcu/stylesheet` shows the
resolved edge, and `yarn install --immutable` verifies the lockfile.

Known upstream tooling warning: the shared ESLint config requires ESLint 9 while
its Unicorn dependency declares ESLint 10.4+. The configured lint command passes.

Vite's bundled config loader supports the repository's extensionless imports but
warns that a future native-loader default will require explicit extensions. The
shared ESLint import policy remains unchanged; this warning is not suppressed.

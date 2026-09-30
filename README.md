# claude-certification

React + TypeScript with two renderer entry points: React DOM served by Vite in
`src/web/main.tsx`, and Ink in `src/cli/main.tsx`. These are minimal setup screens;
application behavior and shared data/state architecture are intentionally not
implemented yet. The existing `questions.json` and PDF extractor are unchanged.

Product/design planning is in [the application vision](docs/planning/vision.md),
which links the scope-based implementation phases. Each phase covers both CLI and
web delivery; the documents do not imply that application behavior is implemented.

## Development

The development toolchain is pinned to Node.js **26.10.0** and Yarn **4.18.1** in
`package.json`. Yarn uses the `node-modules` linker; npm and Corepack are not used.

```sh
yarn install
yarn dev:web    # Vite web development server
yarn dev:cli    # Ink entry point (also: yarn cli)
```

## Build and checks

```sh
yarn build       # Typecheck, then build both renderers
yarn preview     # Preview dist/web
yarn start:cli   # Run dist/cli/main.js
yarn typecheck
yarn lint:fix
```

`yarn build:web` and `yarn build:cli` build individual renderers. CLI dependencies
remain external, so running its build requires installed dependencies. ESLint uses
`@sabinmarcu/eslint-config`, including React, hooks, TypeScript, and accessibility
rules. Husky runs lint-staged followed by typechecking before commits, and
commitlint validates Conventional Commit messages. VS Code uses ESLint, not Prettier.

Web styles use Vanilla Extract and `@sabinmarcu/theme`, as required by the project
instructions. The theme is pinned to 1.2.4 because 1.2.5 omits its declared `dist`
entry points. Unused MUI and Storybook theme integrations are marked optional.

Vitest is installed for future colocated `*.spec.ts` / `*.spec.tsx` tests
(`yarn test`); no application tests or behavior have been added. Compiler settings
are split into base, editor/typecheck, and source build-scope configurations.

Yarn currently reports an upstream lint peer mismatch: the shared config requires
ESLint 9, but its Unicorn dependency declares ESLint 10.4+. The configured lint
command passes with the installed versions.

## Extract questions

Extract the numbered questions from `input.pdf` into `questions.json`:

```sh
yarn install
yarn extract
```

The extractor requires Node.js 22.13.0 or newer and uses `pdfjs-dist`; no external
PDF tools or AI service are required.

Optional input and output paths:

```sh
yarn extract other.pdf output.json
```

The output is an array of objects with this shape. Answers remain in A–D order;
their labels and repeated explanation headings are omitted:

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

The extractor uses this PDF's numbered question headings, answer keys, and
explanation layout. It reconstructs reading order from text coordinates, joins
wrapped lines across pages, and handles reordered explanations, verdicts before
or after the repeated choice, and shared justifications. It validates consecutive
IDs, the advertised question count, answer labels, and agreement between the
answer key and explanation verdicts before writing the output. It is not an OCR
tool or a general parser for unrelated PDF layouts.

The supplied PDF produces **175 questions, 699 answers, and 693 justifications**.
Source exceptions are reported as warnings, not filled with invented content:

- Questions **3** and **57** explain only their correct answers. The other six
  answers have `justification: ""`.
- Question **140** supplies only A, B, and C. Its `answers` array has three entries.

Source wording, typos, and duplicate questions are retained. Correctness flags
reflect the PDF's answer key, not an independent assessment of the material.

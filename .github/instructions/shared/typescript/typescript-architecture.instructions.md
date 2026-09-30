---
description: "TypeScript architecture overview for node projects and monorepos."
applyTo: "**/*.{ts,tsx,cts,mts,js,mjs,cjs,json}"
---
<!-- Managed by @sabinmarcu/ai from lang/typescript@0.1.0. Do not edit directly. -->

# TypeScript Architecture Overview

## Applicability

- Apply this module to node projects that use TypeScript.
- A node project is any folder containing a `package.json`.

## Split Guidance by Concern

- Function-owned types through declaration merging: `typescript-function-namespace-types.instructions.md`
- Build and script conventions: `typescript-build-and-scripts.instructions.md`
- Tsconfig layout and monorepo structure: `typescript-tsconfig-layout.instructions.md`
- Runtime validation and trust boundaries (`zod`): `typescript-runtime-validation.instructions.md`
- Node API typing requirements (`@types/node`): `typescript-node-api-typings.instructions.md`
- Native Node.js and `tsx` script execution: `typescript-native-execution.instructions.md`
- Unit testing with Vitest: `typescript-testing.instructions.md`

## Baseline Summary

- Attach function-owned public types through same-named namespaces such as `Component.Props`.
- Keep `typecheck` enabled with `tsc -p tsconfig.json --noEmit`.
- Use TypeScript build scripts only when TypeScript owns output generation.
- Keep tsconfig responsibilities split between base, typecheck/editor, and build files.
- Use `zod` for runtime validation of external/untrusted data.
- Install `@types/node` when Node.js APIs are used.
- Check native Node.js compatibility before executing TypeScript; otherwise use the installed `tsx` binary or `yarn dlx tsx`.
- Use explicitly imported Vitest APIs in colocated `*.spec.ts` and `*.spec.tsx` unit tests.

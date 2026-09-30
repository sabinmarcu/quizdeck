---
description: "TypeScript build and script conventions for node projects."
applyTo: "**/package.json"
---
<!-- Managed by @sabinmarcu/ai from lang/typescript@0.1.0. Do not edit directly. -->

# TypeScript Build and Scripts

## Required Typecheck Script

- A TypeScript node project must define `typecheck` in `package.json`.
- Recommended baseline:

```json
{
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```
- Keep `typecheck` even when linting exists; it is the fastest baseline for type safety verification.

## Build System Selection

- Use TypeScript (`tsc`) for build output only when no other build system owns output generation (for example Vite, Webpack, Rollup, framework-native builders).
- If another build system owns output generation, keep `typecheck` and do not enforce TypeScript-driven build scripts.

## TypeScript-Driven Build Scripts

If TypeScript is the build system, `package.json` should define:

1. `build` compiling with `tsconfig.build.json`
2. `dev` running watch compilation with `tsconfig.build.json`

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc -p tsconfig.build.json --watch"
  }
}
```

- Keep these scripts aligned with the build system that owns output generation.

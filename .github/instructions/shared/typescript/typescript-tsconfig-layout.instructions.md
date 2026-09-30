---
description: "TypeScript tsconfig layout for regular projects and monorepos."
applyTo: "**/tsconfig*.json"
---
<!-- Managed by @sabinmarcu/ai from lang/typescript@0.1.0. Do not edit directly. -->

# TypeScript Tsconfig Layout

## Standard Config Split

A TypeScript project should use three tsconfig files:

1. `tsconfig.base.json`
2. `tsconfig.json`
3. `tsconfig.build.json`

### `tsconfig.base.json`

- Holds shared compiler options.
- Avoid specializing it for build-only or test-only behavior.

### `tsconfig.json`

- Extends `./tsconfig.base.json`.
- Includes full editor/AI/typecheck scope.
- Serves as the `typecheck` input.

### `tsconfig.build.json`

- Extends sibling `./tsconfig.json`.
- Includes only buildable source files.
- Excludes non-buildable files (tests, stories, fixtures, tooling scratch files).

## Monorepo Layout

### Root

- Root has `tsconfig.base.json` for shared options.
- Root has `tsconfig.json` with references to workspace/package `tsconfig.json` files.
- Root has `tsconfig.build.json` with references to workspace/package `tsconfig.build.json` files.
- Root TypeScript projects should use `composite: true` and `incremental: true`.

### Package/Workspace

Each package should behave like a regular project:

1. Package `tsconfig.json` extends root `tsconfig.base.json`.
2. Package `tsconfig.build.json` extends sibling package `tsconfig.json`.
3. Package `tsconfig.build.json` excludes non-buildable files and adds build-output settings.
4. Package TypeScript projects should use `composite: true` and `incremental: true`.
5. Scripts should use `-p` (not `-b`) so the selected project config remains the command entrypoint.

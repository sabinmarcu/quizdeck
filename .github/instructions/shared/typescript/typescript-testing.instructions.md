---
description: "TypeScript unit testing conventions for Vitest, colocated specs, and explicit imports."
applyTo: "**/*.{ts,tsx,cts,mts,json}"
---
<!-- Managed by @sabinmarcu/ai from lang/typescript@0.1.0. Do not edit directly. -->

# TypeScript Unit Testing

## Test Runner

- Always use Vitest for TypeScript and JavaScript unit tests.
- Never introduce Jest, `node:test`, or another unit-test runner when Vitest can run the tests.
- Use Vitest-native APIs and mocks. Do not add Jest compatibility helpers or use `jest.*` APIs.
- Install `vitest` as a development dependency and use `vitest run` for non-watch test scripts.

## File Placement and Naming

- Colocate each unit test with the source file it tests.
- Name the unit test after that source file using the `.spec` suffix:
  - `fileX.ts` must be tested by `fileX.spec.ts`.
  - `Component.tsx` must be tested by `Component.spec.tsx`.
- Keep a unit test file bound to its matching source file. Split tests when behavior belongs to different source files.
- Do not use `__tests__` directories, centralized unit-test directories, `.test.ts` names, or other detached test layouts.

## Explicit Vitest Imports

- Import every test API used by the file directly from `vitest`, including `describe`, `it`, `test`, `expect`, hooks, and `vi`.
- Never enable or rely on testing globals. Keep Vitest's `globals` option disabled and do not add `vitest/globals` to TypeScript types.

```ts
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
```

- Prefer `vi` for spies, mocks, fake timers, and module mocking.
- Import hooks such as `beforeEach` and `afterEach` only in files that use them.
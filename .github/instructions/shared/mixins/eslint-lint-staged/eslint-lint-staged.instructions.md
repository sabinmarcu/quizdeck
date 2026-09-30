---
description: "Fix staged JavaScript and TypeScript files with ESLint through lint-staged."
applyTo: "**/package.json"
---
<!-- Managed by @sabinmarcu/ai from mixin/eslint-lint-staged@0.1.0. Do not edit directly. -->

# ESLint lint-staged Integration

- Keep `lint` and `lint:fix` scripts owned by the ESLint module.
- Keep the `lint-staged` package script owned by the lint-staged module.
- Configure lint-staged JavaScript and TypeScript patterns to invoke `eslint --fix` directly on staged files.
- Do not add Git hook behavior here; the Husky lint-staged mixin owns hook invocation when Husky is active.
- Fail staged-file validation when ESLint cannot fix or validate a selected file.
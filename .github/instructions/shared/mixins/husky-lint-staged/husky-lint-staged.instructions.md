---
description: "Run lint-staged from a Husky-managed pre-commit hook."
applyTo: "**/{package.json,.husky/pre-commit}"
---
<!-- Managed by @sabinmarcu/ai from mixin/husky-lint-staged@0.1.0. Do not edit directly. -->

# Husky lint-staged Integration

- Keep the `lint-staged` package script and staged-file task mappings owned by lint-staged and its tool integrations.
- Invoke the `lint-staged` package script from the Husky `pre-commit` hook through the selected package manager.
- Preserve TypeScript and Yarn checks contributed by other active Husky mixins.
- Fail the commit when any configured staged-file task fails.
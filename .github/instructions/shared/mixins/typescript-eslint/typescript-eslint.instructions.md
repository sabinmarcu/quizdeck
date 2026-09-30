---
description: "TypeScript integration requirements for projects using the shared ESLint configuration."
applyTo: "**/*.{ts,tsx,cts,mts,js,mjs,cjs,json}"
---
<!-- Managed by @sabinmarcu/ai from mixin/typescript-eslint@0.1.0. Do not edit directly. -->

# TypeScript ESLint Integration

## Required Peer

- Install `typescript-eslint` in the dependency scope from which ESLint and `@sabinmarcu/eslint-config` resolve tooling.
- Follow the repository's dependency-placement policy when choosing the dependency field and owning project.
- Do not substitute the older split `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` installation described by stale documentation; the shared config dynamically imports the `typescript-eslint` package.
- Treat a missing peer as a configuration failure even though the shared config degrades without throwing.

## Shared Configuration Ownership

- Keep `@sabinmarcu/eslint-config` active as the shared flat-config baseline.
- Rely on the shared config to register the TypeScript parser and plugin, match TypeScript file extensions, configure TypeScript import resolution, enable TypeScript rules, and set `parserOptions.projectService`.
- Do not duplicate parser, plugin, resolver, or project-service configuration in the consumer config.
- Keep a discoverable TypeScript project configuration for files that require type-aware linting.
- Add a named project override only when repository behavior differs from the shared baseline.

## Validation

- Inspect the effective ESLint configuration for a representative TypeScript source file after dependency or lint configuration changes.
- Confirm that the effective parser is the TypeScript parser and that TypeScript plugin rules are present.
- Lint representative `.ts` and `.tsx` files; a successful JavaScript-only lint run does not prove that the optional TypeScript config loaded.
- Fail setup validation when the shared config reports that it skipped TypeScript configuration.
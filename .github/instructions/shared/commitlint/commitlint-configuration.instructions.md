---
description: "Commit-message validation infrastructure with commitlint."
applyTo: "**/*.{json,js,cjs,mjs}"
---
<!-- Managed by @sabinmarcu/ai from tooling/commitlint@0.1.0. Do not edit directly. -->

# Commitlint Infrastructure

- Install `@commitlint/cli` as a development dependency.
- Define a `commitlint` package script using `commitlint --edit`.
- Keep commitlint configuration in a dedicated root file such as `commitlint.config.cjs`, `commitlint.config.mjs`, or another filename supported by the installed commitlint version.
- Do not place commitlint rules, extends, parser presets, or plugin configuration in `package.json`.
- Keep only commitlint dependencies and package scripts in `package.json`.
- Keep the project configuration structurally valid and let active guidance integrations select shareable configs and rules.
- Do not assume Conventional Commits, workspace scopes, or another format inside this ordinary tooling module.
- Validate against current commitlint documentation when introducing rules or upgrading.
- Keep Git hook integration out of this module; the Husky integration mixin owns it.
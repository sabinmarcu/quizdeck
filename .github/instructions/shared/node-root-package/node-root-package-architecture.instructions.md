---
description: "Repository-root Node package policy for monorepos and standalone packages."
applyTo: "**/{package.json,.husky/**,eslint.config.js,eslint.config.mjs,eslint.config.cjs}"
---
<!-- Managed by @sabinmarcu/ai from arch/node-root-package@0.1.0. Do not edit directly. -->

# Node Root Package Architecture

## Applicability

- Apply to a Node package at the repository root.
- Apply whether the repository is a standalone package or a monorepo.
- Do not apply this module to workspace-local packages.

## Repository Tooling Baseline

- Install and configure ESLint, lint-staged, Husky, and commitlint at the repository root.
- Keep each tool's standalone configuration owned by its tooling module.
- Let active mixins compose staged linting and Git hook behavior.
- Keep repository-level hooks and checks centralized at the root rather than duplicating them in workspaces.
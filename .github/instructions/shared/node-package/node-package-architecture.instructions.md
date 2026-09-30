---
description: "Architecture overview for common node project guardrails."
applyTo: "**/*.{ts,tsx,cts,mts,js,mjs,cjs,json,sh}"
---
<!-- Managed by @sabinmarcu/ai from arch/node-package@0.1.0. Do not edit directly. -->

# Node Project Architecture Overview

## Applicability

- Apply this module to any node project (any folder containing `package.json`).
- Apply it to every application and library subtype.

## Source Layout

- Keep source code under `/src` by default.
- Repository-local guidance may explicitly override this shared layout when a framework or project constraint requires another source root.
- Do not infer a `/dist` contract from this module; publication and build integrations own output layout.

## Split Guidance by Concern

- Package manager selection: `node-package-package-managers.instructions.md`
- Proto toolchain usage and MCP setup: `node-package-proto.instructions.md`
- ESLint baseline and Prettier prohibition: `node-package-eslint-prettier-policy.instructions.md`
- VS Code and Neovim Prettier-disable guidance: `node-package-editor-prettier-disable.instructions.md`

## Baseline Summary

- Do not use npm or Corepack.
- Prefer Proto and Yarn Modern, with Plug'n'Play when compatible.
- Use ESLint as the lint/format baseline.
- Do not use Prettier in this architecture.

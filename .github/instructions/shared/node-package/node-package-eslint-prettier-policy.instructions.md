---
description: "Lint baseline for node packages: ESLint expected, Prettier forbidden."
applyTo: "**/*.{ts,tsx,cts,mts,js,mjs,cjs,json}"
---
<!-- Managed by @sabinmarcu/ai from arch/node-package@0.1.0. Do not edit directly. -->

# Node Package ESLint and Prettier Policy

## Linting Baseline

- ESLint is strongly recommended for all node package setups (libraries, apps, and tools).
- Prettier is strictly forbidden in this architecture policy.
- Formatting concerns should be handled through ESLint rules and supported ecosystem integrations instead of introducing Prettier.

## Operational Notes

- Keep formatting and linting policy centralized in ESLint configuration.
- Avoid mixing formatter stacks that conflict with ESLint-driven formatting behavior.

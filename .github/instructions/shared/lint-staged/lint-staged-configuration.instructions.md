---
description: "Staged-file task execution with lint-staged."
applyTo: "**/package.json"
---
<!-- Managed by @sabinmarcu/ai from tooling/lint-staged@0.1.0. Do not edit directly. -->

# lint-staged Configuration

- Install `lint-staged` as a development dependency.
- Define a `lint-staged` package script that invokes the installed binary.
- Keep staged-file task mappings owned by integrations with the tools that perform those tasks.
- Keep Git hook invocation owned by the active Husky integration.
- Prefer fast, fixing operations that preserve the staged-file boundary.
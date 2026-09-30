---
description: "Husky lifecycle and modern Git hook configuration for Node projects."
applyTo: "**/*.{json,sh}"
---
<!-- Managed by @sabinmarcu/ai from tooling/husky@0.1.0. Do not edit directly. -->

# Husky Configuration

## Applicability

- Apply to Node projects that use Husky for local Git hooks.
- Prefer current Husky documentation and recommended commands and workflows.
- Do not copy legacy setup snippets without checking current documentation.

## Configuration

- Include the currently recommended Husky bootstrap entrypoint in package scripts.
- Keep hook scripts small, deterministic, and focused on fast local checks.
- Delegate linting, type checking, commit-message validation, and package-manager checks to scripts owned by their respective modules.
- Compose hook commands from active mixin guidance rather than assuming every project has every tool.

## Legacy Guardrails

- Do not use legacy Husky configuration in `package.json`.
- Do not use deprecated install or bootstrap commands retained in old examples.
- Revalidate existing hooks against current Husky documentation when upgrading Husky.
---
description: "Commit-message validation through a Husky commit-msg hook."
applyTo: "**/{package.json,.husky/commit-msg}"
---
<!-- Managed by @sabinmarcu/ai from mixin/husky-commitlint@0.1.0. Do not edit directly. -->

# Husky Commitlint Integration

- Keep commitlint dependencies, configuration, and the `commitlint` package script owned by the commitlint module.
- Invoke the `commitlint` package script from the Husky `commit-msg` hook through the selected package manager.
- Forward the commit-message file argument from Husky to commitlint without rewriting it.
- Fail the commit when commitlint rejects the message.
- Recheck both tools' current documentation before changing hook syntax.
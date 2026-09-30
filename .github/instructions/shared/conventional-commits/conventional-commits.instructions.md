---
description: "Universal commit-authoring guidance based on Conventional Commits."
applyTo: "**/*"
---
<!-- Managed by @sabinmarcu/ai from guidance/conventional-commits@0.1.0. Do not edit directly. -->

# Conventional Commits Guidance

## Format

- Use Conventional Commits for every commit.
- Format the first line as `<type>(<optional-scope>): <description>`.
- Use common types such as `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, and `build`.
- Treat the text after the type and optional scope as the commit title; follow the title guidance from `guidance/commits`.
- Keep that text concise and imperative.
- Use `!` or a `BREAKING CHANGE:` footer when the commit introduces a breaking change.

## Scope

- Use a concise scope when the affected project, package, subsystem, or concern is clear.
- Omit the scope when no repository-specific guidance requires one and a useful scope would be artificial.
- Follow more specific repository guidance when it defines required or allowed scopes.

## Body and Footers

- Follow the bullet-list commit description guidance from `guidance/commits`.
- Add motivation, tradeoffs, or non-obvious context to the relevant bullets when it will help future readers.
- Use footers for breaking changes, issue references, and other structured metadata.
- Keep unrelated changes in separate commits.

## Enforcement Independence

- Follow this guidance whether or not the repository has commitlint or another enforcement tool.
- Treat repository-local exceptions as explicit policy that must be documented.
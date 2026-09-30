---
description: "Global convention for machine-local agent instructions and resource locations."
applyTo: "**/*"
---
<!-- Managed by @sabinmarcu/ai from global/core@0.1.0. Do not edit directly. -->

# Global Local Agent Notes Policy

## Purpose

- Allow agents to record repository-specific information that applies only to the current machine.
- Use these notes for local resource locations, such as where the source checkout for a dependency can be found.

## Local Instructions File

- Store machine-local agent instructions in `AGENTS.local.md` at the repository root.
- `AGENTS.local.md` must be gitignored and must not be committed.
- Agents may create or update this file when machine-local context would help future repository work.
- Agents should consult this file when it exists.
- Keep shared project instructions in tracked instruction files rather than `AGENTS.local.md`.
- Do not store secrets, credentials, or tokens in `AGENTS.local.md`.

## Minimal Template

```markdown
# Local Agent Notes

## Source Checkouts

- `<package-name>`: `<local-path-or-URI>`
```

## Hard Rule Summary

- Machine-local agent instructions belong in a gitignored repository-root `AGENTS.local.md` file.
- The file may describe local resources but must not contain secrets or shared project policy.
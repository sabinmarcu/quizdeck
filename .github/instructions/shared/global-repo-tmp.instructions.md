---
description: "Global guardrail for repository-local temporary files and debug artifacts."
applyTo: "**/*"
---
<!-- Managed by @sabinmarcu/ai from global/core@0.1.0. Do not edit directly. -->

# Global Repository Tmp Policy

## Purpose

- Standardize where temporary files and debug artifacts are stored during repository work.

## Repository Tmp Folder

- AI agents may create a `/tmp` folder at the repository root.
- `/tmp` should be gitignored.
- Use `/tmp` for redirected command output, debug traces, and other temporary files created during repository tasks.

## Temporary Path Preference

- Prefer repository-local `/tmp` over operating-system temporary paths.
- Do not use OS-level temporary folders outside the repository for task artifacts when repository-local `/tmp` can be used.

## Hard Rule Summary

- Temporary task artifacts should live in a gitignored repository-root `/tmp` folder.
- OS temp folders should not be the default destination for repository task artifacts.
---
description: "Shared architecture and publication guardrails for Node package libraries."
applyTo: "**/*.{ts,tsx,cts,mts,js,mjs,cjs,json}"
---
<!-- Managed by @sabinmarcu/ai from arch/node-package-library@0.1.0. Do not edit directly. -->

# Node Package Library Architecture

## Applicability

- Libraries are projects intended to be published or consumed by other projects.
- A library must specialize as a node library or web library.
- Node and web libraries are mutually exclusive.
- Node and web applications cannot also be libraries; a node tool is also a node library.

## Source and Publication Contract

- Keep source code under `/src` unless repository-local guidance explicitly overrides the shared layout.
- Emit publishable artifacts to `/dist`.
- Exclude `/dist` from source lint and typecheck inputs.
- Define package exports and published files against built artifacts rather than source-only entry points.
- Validate the packed package and its public entry points before publication.

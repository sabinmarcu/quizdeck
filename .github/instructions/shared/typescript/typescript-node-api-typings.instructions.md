---
description: "TypeScript node API typing requirements."
applyTo: "**/*.{ts,tsx,cts,mts,js,mjs,cjs,json}"
---
<!-- Managed by @sabinmarcu/ai from lang/typescript@0.1.0. Do not edit directly. -->

# TypeScript Node API Typings

## Node Type Definition Requirement

- If a TypeScript project uses Node.js-specific APIs (for example `process`, `fs`, `path`, `url`, `Buffer`, or `node:*` imports), install `@types/node` as a `devDependency`.
- Ensure TypeScript includes Node typings in compiler context (for example with `"types": ["node"]` when appropriate for the project setup).

## Practical Notes

- Keep Node typing scope aligned with the runtime target.
- Prefer explicit Node typing setup over relying on editor defaults.

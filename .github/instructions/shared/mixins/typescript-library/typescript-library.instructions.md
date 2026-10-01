---
description: "TypeScript build and declaration output requirements for publishable libraries."
applyTo: "**/{package.json,tsconfig*.json}"
---
<!-- Managed by @sabinmarcu/ai from mixin/typescript-library@0.1.0. Do not edit directly. -->

# TypeScript Library Integration

## Build Contract

- Configure `tsconfig.build.json` with `rootDir: "src"` and `outDir: "dist"` when TypeScript owns output generation.
- Emit public declarations into `/dist` and align package type exports with those declarations.
- Exclude tests, stories, fixtures, and generated output from the build configuration.
- Keep the library `/src` to `/dist` contract when another builder owns emission, but configure that contract through the owning builder rather than duplicating it in TypeScript.
- Repository-local guidance may override the source layout; keep TypeScript and package publication configuration aligned with that explicit override.

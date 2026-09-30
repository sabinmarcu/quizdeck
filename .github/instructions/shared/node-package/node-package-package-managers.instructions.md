---
description: "Package manager policy for node packages, favoring Proto and Yarn Modern."
applyTo: "**/{package.json,yarn.lock,.yarnrc.yml}"
---
<!-- Managed by @sabinmarcu/ai from arch/node-package@0.1.0. Do not edit directly. -->

# Node Package Manager Policy

## Required Policy

- Using npm is strictly forbidden. Do not run `npm`, `npx`, or npm lifecycle commands.
- Using Corepack is strictly forbidden. Do not enable, prepare, install, or invoke package managers through Corepack.
- Using Proto is strongly encouraged for installing, pinning, and invoking Node.js and Yarn. Follow `node-package-proto.instructions.md` for Proto usage and MCP setup.
- Using Yarn Berry, also called Yarn Modern or Yarn 2+, is strongly encouraged. Apply the `tooling/yarn` module for Yarn configuration and workflows.
- Pin the selected package manager and version in project configuration so local development and automation use the same toolchain.
---
description: "Architecture guardrails for one-off Node.js executables used by developers and CI."
applyTo: "**/*.{ts,cts,mts,js,mjs,cjs,json}"
---
<!-- Managed by @sabinmarcu/ai from arch/node-tool@0.1.0. Do not edit directly. -->

# Node Tool Architecture

## Applicability

- Apply this module to Node.js programs executed in a one-off fashion by developers, automation, or CI.
- A node tool is also a node library and follows its publication and runtime contracts.
- A published CLI remains a node tool when its primary purpose is execution rather than API consumption.

## Execution Contract

- Declare executable entry points explicitly.
- Keep exit codes stable and meaningful.
- Use stdout for command results and stderr for diagnostics.
- Support non-interactive execution and predictable signal handling.
- Avoid server lifecycle and deployment assumptions.

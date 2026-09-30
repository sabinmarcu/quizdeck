---
description: "Shared architecture guardrails for deployable and executable Node package projects."
applyTo: "**/*.{ts,tsx,cts,mts,js,mjs,cjs,json}"
---
<!-- Managed by @sabinmarcu/ai from arch/node-package-application@0.1.0. Do not edit directly. -->

# Node Package Application Architecture

## Applicability

- Applications are projects intended to be deployed or executed.
- An application must specialize as a node application, web application, or node tool.
- Node applications and web applications cannot also be libraries.
- A node tool is also a node library because it is packaged for reuse while exposing one-off executable entry points.

## Runtime Ownership

- Keep runtime entry points and lifecycle behavior explicit.
- Keep source code under `/src` unless repository-local guidance explicitly overrides the shared layout.
- Let the runtime, deployment platform, or framework own generated output layout for node and web applications.
- Node tools inherit the library `/dist` publication contract through the node-library module.

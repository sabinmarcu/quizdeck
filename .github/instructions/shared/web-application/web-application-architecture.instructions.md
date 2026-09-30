---
description: "Architecture guardrails for deployable applications that serve browsers."
applyTo: "**/*.{ts,tsx,js,jsx,json,html,css}"
---
<!-- Managed by @sabinmarcu/ai from arch/web-application@0.1.0. Do not edit directly. -->

# Web Application Architecture

## Applicability

- Apply this module to deployable applications that serve browser clients.
- Keep framework-specific layout and generated output under the owning framework's conventions.

## Deployment Boundaries

- Keep browser, server, and build-time boundaries explicit.
- Treat routes, static assets, environment configuration, and deployment artifacts as application-owned concerns.
- Do not assume React or any other specific UI framework.

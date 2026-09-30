---
description: "Modern browser targets and no-polyfill native web API policy."
applyTo: "**/*.{ts,tsx,js,jsx,css,css.ts,html,json}"
---
<!-- Managed by @sabinmarcu/ai from guardrails/web-platform@0.1.0. Do not edit directly. -->

# Modern Web Platform Guardrails

## Browser Baseline

- Target the latest stable Chromium, Safari, and iOS Safari releases.
- Firefox support is not required.
- Android browser support is not a target because its effective browser and WebView support matrix is not treated as stable enough for this baseline.
- Do not add compatibility polyfills or transpilation solely for older browsers.
- Do not constrain architecture to legacy-browser limitations outside the supported baseline.

## Native APIs

- Prefer native platform APIs when they are available in the supported baseline and simplify the implementation.
- Prefer semantic HTML controls, native dialog and popover behavior, View Transitions, container queries, modern CSS, and current date/time APIs over dependencies that only reproduce platform behavior.
- Allow natural degradation only when the core workflow remains intact and accessible.
- When a required capability is part of the supported baseline, use it directly instead of adding a legacy fallback.
- Verify behavior in current Chromium and Safari engines when adopting a recently shipped or engine-sensitive API.

## Dependency Decisions

- Add a browser-facing dependency when it supplies meaningful product behavior, complex standards-compliant logic, or a substantially safer abstraction.
- Do not add a dependency merely to wrap a small native API.
- Keep browser support assumptions visible in feature documentation or tests when a feature relies on a recently shipped capability.
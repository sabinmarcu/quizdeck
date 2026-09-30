---
description: "Vanilla Extract, typed themes, component styling, and responsive web layout policy."
applyTo: "**/*.{ts,tsx,js,jsx,css,css.ts}"
---
<!-- Managed by @sabinmarcu/ai from guardrails/web-style@0.1.0. Do not edit directly. -->

# Web Styling Guardrails

## Styling Stack

- Always use Vanilla Extract for new web projects.
- Strongly prefer Vanilla Extract for new work in existing web projects. Migrate deliberately when doing so will not leave one feature split across competing styling systems.
- Whenever Vanilla Extract is used, install and use `@sabinmarcu/theme`. Vanilla Extract without `@sabinmarcu/theme` is not an approved configuration.
- Use the shared theme as the required source for colors, spacing, typography, breakpoints, and other reusable design values.
- Do not introduce ad hoc color literals, spacing scales, typography scales, or breakpoint values when the theme can represent them.
- Keep product-specific theme extensions within the application that owns them. Shared component packages should depend on the core theme contract rather than a product theme.

## Component Styles

- Co-locate `Component.css.ts` with `Component.tsx`.
- Keep global reset and truly global selectors in dedicated global style files.
- Use Vanilla Extract recipes for stable, typed component variants.
- Use `selectors` only for selectors anchored on the current class through `&`.
- Use `globalStyle` deliberately for descendants, external elements, document-level selectors, and pseudo-elements that cannot be expressed from the current class.
- Prefer a shared wrapper or primitive component over a shared style-only module when markup, behavior, and styles must travel together.
- Share styles only when the participating components have one clear owner and evolve together.

## Responsive Design

- Use intrinsically responsive CSS before adding queries. Prefer flexible grid tracks, `auto-fit` or `auto-fill`, `minmax`, wrapping, logical properties, intrinsic sizing, and bounded fluid values.
- Use a container query only when a component's layout or visual design must change because its own container crosses a meaningful threshold.
- Establish a deliberate query container owned by the layout that controls the queried component.
- Do not add a container query when content only needs to shrink, wrap, scroll, or flow naturally.
- Write container conditions using container features such as width. Do not copy media-query expression strings into `@container` rules.
- Do not use media queries for layout responsiveness.
- Viewport preference queries such as `prefers-color-scheme`, `prefers-contrast`, and `prefers-reduced-motion` remain valid because they represent user or device preferences rather than layout thresholds.
- Use container-relative units only when a deliberate query container establishes their intended sizing context.
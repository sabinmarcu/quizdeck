---
description: "Accessibility requirements for semantic, keyboard-operable web components."
applyTo: "**/*.{ts,tsx,js,jsx,css,css.ts,html}"
---
<!-- Managed by @sabinmarcu/ai from guardrails/web-style@0.1.0. Do not edit directly. -->

# Web Accessibility Guardrails

## Semantic Structure

- Use native semantic HTML elements before adding ARIA roles or recreating browser controls.
- Preserve valid heading order, landmarks, labels, and relationships between controls and descriptive content.
- Give every icon-only or otherwise non-text control an accessible name.
- Use ARIA only to express semantics or state that native HTML cannot provide. Keep ARIA state synchronized with visible state.

## Keyboard and Focus

- Make every interactive workflow operable by keyboard.
- Preserve visible `:focus-visible` treatment with sufficient contrast.
- Keep focus order aligned with reading and interaction order.
- Move or restore focus deliberately when opening and closing dialogs, popovers, and other temporary surfaces.
- Do not make non-interactive elements clickable without also supplying the correct semantics and complete keyboard behavior.

## Custom Controls

- Expose state for custom controls with appropriate semantics such as `aria-checked`, `aria-pressed`, `aria-expanded`, and accessible grouping.
- Prefer native `button`, `input`, `select`, `dialog`, and popover behavior over custom equivalents.
- Provide inline, associated error text for invalid inputs and announce asynchronous errors when necessary.
- Keep target sizes and spacing usable for touch input on supported iOS devices.

## Motion and Media

- Respect `prefers-reduced-motion` for nonessential animation and transitions.
- Do not rely on color, motion, hover, or sound alone to communicate state.
- Provide text alternatives for meaningful images and captions or equivalent alternatives for meaningful audio and video content.
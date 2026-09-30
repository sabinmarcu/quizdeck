---
description: "Renderer-neutral React, hooks, JSX, and TSX integration requirements for projects using the shared ESLint configuration."
applyTo: "**/*.{ts,tsx,js,jsx,mjs,cjs,json}"
---
<!-- Managed by @sabinmarcu/ai from mixin/react-eslint@0.1.0. Do not edit directly. -->

# React ESLint Integration

## Required Peers

- Ensure `react` is resolvable from the dependency scope where ESLint runs.
- Install `eslint-plugin-react` and `eslint-plugin-react-hooks` in the dependency scope from which ESLint and `@sabinmarcu/eslint-config` resolve tooling.
- Follow the repository's dependency-placement policy when choosing dependency fields and owning projects.
- Treat a missing optional peer as a configuration failure even though the shared config degrades without throwing.

## Shared Configuration Ownership

- Keep `@sabinmarcu/eslint-config` active as the shared flat-config baseline.
- Rely on the shared config for its React and hooks rule definitions and plugin registration.
- Do not copy the shared React or hooks rule sets into project configuration.
- Keep project-specific exceptions in descriptively named flat-config chunks with narrow file scopes.

## Temporary TSX and Hooks Completion

The current shared config scopes its React chunks to `**/*.jsx` and registers the hooks plugin without enabling hooks rules. Until the shared config covers TSX and enables hooks rules itself:

- Import the shared React and hooks configs through their exported
  `rules/jsx/react` and `rules/jsx/reactHooks` subpaths.
- Reuse those config chunks for `**/*.tsx` by replacing only their file selectors and names.
- Add a named rule-only chunk for `**/*.{jsx,tsx}` using the hooks plugin's recommended rules.
- Append the temporary chunks after the shared baseline.
- Do not fork or copy the shared React or hooks rule objects.

Representative pattern:

```js
import sharedReactConfig from '@sabinmarcu/eslint-config/rules/jsx/react';
import sharedReactHooksConfig from '@sabinmarcu/eslint-config/rules/jsx/reactHooks';
import reactHooks from 'eslint-plugin-react-hooks';

const sharedTsxConfig = [
  ...sharedReactConfig,
  ...sharedReactHooksConfig,
].map(({
  files: _files,
  name,
  ...config
}) => ({
  ...config,
  name: `${name ?? 'Shared React'}/TSX`,
  files: ['**/*.tsx'],
}));

const reactHooksRules = {
  name: 'Project React Hooks Rules',
  files: ['**/*.{jsx,tsx}'],
  rules: {
    ...reactHooks.configs.recommended.rules,
  },
};
```

Remove these temporary chunks only after the installed shared config demonstrably applies equivalent React and hooks rules to both JSX and TSX.

## Validation

- Inspect the effective ESLint configuration for representative `.jsx` and `.tsx` component files.
- Confirm that React plugins and rules are active for both file types.
- Confirm that hooks rules such as `react-hooks/rules-of-hooks` are active.
- Lint representative JSX and TSX components; success on JavaScript or TypeScript files without JSX does not prove React integration loaded.
- Fail setup validation when the shared config reports that it skipped React or hooks configuration.
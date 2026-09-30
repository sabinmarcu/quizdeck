---
description: "Web accessibility linting requirements for React projects using the shared ESLint configuration."
applyTo: "**/*.{ts,tsx,js,jsx,mjs,cjs,json}"
---
<!-- Managed by @sabinmarcu/ai from mixin/web-react-eslint@0.1.0. Do not edit directly. -->

# Web React ESLint Integration

## Required Peer

- Install `eslint-plugin-jsx-a11y` in the dependency scope from which ESLint and `@sabinmarcu/eslint-config` resolve tooling.
- Follow the repository's dependency-placement policy when choosing the dependency field and owning project.
- Treat a missing optional peer as a configuration failure even though the shared config degrades without throwing.

## Shared Configuration Ownership

- Keep `@sabinmarcu/eslint-config` active as the shared flat-config baseline.
- Rely on the shared config for accessibility rule definitions and plugin registration.
- Do not copy the shared accessibility rule set into project configuration.
- Keep project-specific exceptions in descriptively named flat-config chunks with narrow file scopes.

## Temporary TSX Completion

The current shared config scopes its accessibility chunks to `**/*.jsx`. Until the shared config covers TSX itself:

- Import the shared accessibility config through its exported `rules/jsx/reactA11y` subpath.
- Reuse those config chunks for `**/*.tsx` by replacing only their file selectors and names.
- Append the temporary chunks after the shared baseline.
- Do not fork or copy the shared accessibility rule object.

Representative pattern:

```js
import sharedReactA11yConfig from '@sabinmarcu/eslint-config/rules/jsx/reactA11y';

const sharedTsxA11yConfig = sharedReactA11yConfig.map(({
  files: _files,
  name,
  ...config
}) => ({
  ...config,
  name: `${name ?? 'Shared React Accessibility'}/TSX`,
  files: ['**/*.tsx'],
}));
```

Remove this temporary chunk only after the installed shared config demonstrably applies equivalent accessibility rules to both JSX and TSX.

## Validation

- Inspect the effective ESLint configuration for representative `.jsx` and `.tsx` web component files.
- Confirm that the accessibility plugin and rules are active for both file types.
- Lint representative JSX and TSX web components; success on files without JSX does not prove accessibility integration loaded.
- Fail setup validation when the shared config reports that it skipped accessibility configuration.

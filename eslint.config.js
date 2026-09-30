import sharedConfig from '@sabinmarcu/eslint-config';
import sharedReactConfig from '@sabinmarcu/eslint-config/rules/jsx/react';
import sharedReactA11yConfig from '@sabinmarcu/eslint-config/rules/jsx/reactA11y';
import sharedReactHooksConfig from '@sabinmarcu/eslint-config/rules/jsx/reactHooks';
import reactHooks from 'eslint-plugin-react-hooks';

const sharedTsxConfig = [
  ...sharedReactConfig,
  ...sharedReactHooksConfig,
  ...sharedReactA11yConfig,
].map(({
  files: _files, name, ...config
}) => ({
  ...config,
  name: `${name ?? 'Shared React'}/TSX`,
  files: ['**/*.tsx'],
}));

export default [
  {
    name: 'Project generated and managed files',
    ignores: ['dist/**', 'tmp/**', '.yarn/**', '.ai/**', '.github/**', '.pnp.*'],
  },
  ...sharedConfig,
  // Shared React chunks currently cover JSX only; reuse them for TSX.
  ...sharedTsxConfig,
  {
    name: 'Project JSX Syntax',
    files: ['**/*.jsx'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    name: 'Project React Hooks Rules',
    files: ['**/*.{jsx,tsx}'],
    rules: reactHooks.configs.recommended.rules,
  },
];

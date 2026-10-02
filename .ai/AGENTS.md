# AI Stack Entrypoint

<!-- Managed by @sabinmarcu/ai. Do not edit directly. -->

## Reconciliation

Use the [stack reconciliation skill](../.github/skills/stack-reconciliation/SKILL.md) after repository changes may alter module applicability.
- Use the CLI workflow from that skill; do not edit managed files or stack state directly.

## Required Shared Instructions

Before working in this repository, open, read, and follow every linked file below. These files are the active shared instruction set, not optional references.

### Module Instructions

- [guidance/commits: commits.instructions.md](../.github/instructions/shared/commits/commits.instructions.md)
- [guidance/conventional-commits: conventional-commits.instructions.md](../.github/instructions/shared/conventional-commits/conventional-commits.instructions.md)
- [global/core: global-repo-local-agent-notes.instructions.md](../.github/instructions/shared/global-repo-local-agent-notes.instructions.md)
- [global/core: global-repo-tmp.instructions.md](../.github/instructions/shared/global-repo-tmp.instructions.md)
- [arch/node-package: node-package-architecture.instructions.md](../.github/instructions/shared/node-package/node-package-architecture.instructions.md)
- [arch/node-package: node-package-package-managers.instructions.md](../.github/instructions/shared/node-package/node-package-package-managers.instructions.md)
- [arch/node-package: node-package-proto.instructions.md](../.github/instructions/shared/node-package/node-package-proto.instructions.md)
- [arch/node-package: node-package-eslint-prettier-policy.instructions.md](../.github/instructions/shared/node-package/node-package-eslint-prettier-policy.instructions.md)
- [arch/node-package: node-package-editor-prettier-disable.instructions.md](../.github/instructions/shared/node-package/node-package-editor-prettier-disable.instructions.md)
- [arch/node-package-library: node-package-library-architecture.instructions.md](../.github/instructions/shared/node-package-library/node-package-library-architecture.instructions.md)
- [arch/node-library: node-library-architecture.instructions.md](../.github/instructions/shared/node-library/node-library-architecture.instructions.md)
- [tooling/commitlint: commitlint-configuration.instructions.md](../.github/instructions/shared/commitlint/commitlint-configuration.instructions.md)
- [tooling/eslint: eslint-configuration.instructions.md](../.github/instructions/shared/linting/eslint-configuration.instructions.md)
- [tooling/husky: husky-configuration.instructions.md](../.github/instructions/shared/husky/husky-configuration.instructions.md)
- [tooling/lint-staged: lint-staged-configuration.instructions.md](../.github/instructions/shared/lint-staged/lint-staged-configuration.instructions.md)
- [arch/node-root-package: node-root-package-architecture.instructions.md](../.github/instructions/shared/node-root-package/node-root-package-architecture.instructions.md)
- [arch/node-package-application: node-package-application-architecture.instructions.md](../.github/instructions/shared/node-package-application/node-package-application-architecture.instructions.md)
- [arch/node-tool: node-tool-architecture.instructions.md](../.github/instructions/shared/node-tool/node-tool-architecture.instructions.md)
- [arch/react: react-architecture.instructions.md](../.github/instructions/shared/react/react-architecture.instructions.md)
- [guardrails/web-platform: web-platform.instructions.md](../.github/instructions/shared/web-platform/web-platform.instructions.md)
- [guardrails/web-style: web-styling.instructions.md](../.github/instructions/shared/frontend/web-styling.instructions.md)
- [guardrails/web-style: web-accessibility.instructions.md](../.github/instructions/shared/frontend/web-accessibility.instructions.md)
- [lang/typescript: typescript-architecture.instructions.md](../.github/instructions/shared/typescript/typescript-architecture.instructions.md)
- [lang/typescript: typescript-function-namespace-types.instructions.md](../.github/instructions/shared/typescript/typescript-function-namespace-types.instructions.md)
- [lang/typescript: typescript-build-and-scripts.instructions.md](../.github/instructions/shared/typescript/typescript-build-and-scripts.instructions.md)
- [lang/typescript: typescript-tsconfig-layout.instructions.md](../.github/instructions/shared/typescript/typescript-tsconfig-layout.instructions.md)
- [lang/typescript: typescript-runtime-validation.instructions.md](../.github/instructions/shared/typescript/typescript-runtime-validation.instructions.md)
- [lang/typescript: typescript-node-api-typings.instructions.md](../.github/instructions/shared/typescript/typescript-node-api-typings.instructions.md)
- [lang/typescript: typescript-native-execution.instructions.md](../.github/instructions/shared/typescript/typescript-native-execution.instructions.md)
- [lang/typescript: typescript-testing.instructions.md](../.github/instructions/shared/typescript/typescript-testing.instructions.md)
- [tooling/yarn: yarn-configuration.instructions.md](../.github/instructions/shared/yarn/yarn-configuration.instructions.md)

### Mixin Instructions

- [mixin/commitlint-conventional-commits: commitlint-conventional-commits.instructions.md](../.github/instructions/shared/mixins/commitlint-conventional-commits/commitlint-conventional-commits.instructions.md)
- [mixin/eslint-lint-staged: eslint-lint-staged.instructions.md](../.github/instructions/shared/mixins/eslint-lint-staged/eslint-lint-staged.instructions.md)
- [mixin/husky-commitlint: husky-commitlint.instructions.md](../.github/instructions/shared/mixins/husky-commitlint/husky-commitlint.instructions.md)
- [mixin/husky-lint-staged: husky-lint-staged.instructions.md](../.github/instructions/shared/mixins/husky-lint-staged/husky-lint-staged.instructions.md)
- [mixin/husky-typescript: husky-typescript.instructions.md](../.github/instructions/shared/mixins/husky-typescript/husky-typescript.instructions.md)
- [mixin/react-eslint: react-eslint.instructions.md](../.github/instructions/shared/mixins/react-eslint/react-eslint.instructions.md)
- [mixin/typescript-eslint: typescript-eslint.instructions.md](../.github/instructions/shared/mixins/typescript-eslint/typescript-eslint.instructions.md)
- [mixin/typescript-library: typescript-library.instructions.md](../.github/instructions/shared/mixins/typescript-library/typescript-library.instructions.md)
- [mixin/web-react-eslint: web-react-eslint.instructions.md](../.github/instructions/shared/mixins/web-react-eslint/web-react-eslint.instructions.md)

## Repository-Local Override Locations

- `.github/instructions/local/commits/`
- `.github/instructions/local/conventional-commits/`
- `.github/instructions/local/`
- `.github/prompts/local/`
- `.github/skills/local/`
- `.github/agents/local/`
- `.ai-local/`
- `.github/instructions/local/node-package/`
- `.github/instructions/local/node-package-library/`
- `.github/instructions/local/node-library/`
- `.github/instructions/local/commitlint/`
- `.github/instructions/local/linting/`
- `.github/instructions/local/husky/`
- `.github/instructions/local/lint-staged/`
- `.github/instructions/local/node-root-package/`
- `.github/instructions/local/node-package-application/`
- `.github/instructions/local/node-tool/`
- `.github/instructions/local/react/`
- `.github/instructions/local/web-platform/`
- `.github/instructions/local/frontend/`
- `.github/instructions/local/typescript/`
- `.github/instructions/local/yarn/`
- `.github/instructions/local/mixins/commitlint-conventional-commits/`
- `.github/instructions/local/mixins/eslint-lint-staged/`
- `.github/instructions/local/mixins/husky-commitlint/`
- `.github/instructions/local/mixins/husky-lint-staged/`
- `.github/instructions/local/mixins/husky-typescript/`
- `.github/instructions/local/mixins/react-eslint/`
- `.github/instructions/local/mixins/typescript-eslint/`
- `.github/instructions/local/mixins/typescript-library/`
- `.github/instructions/local/mixins/web-react-eslint/`

Managed shared assets are replaced during reconciliation. Keep repository-specific tuning in the override locations above.

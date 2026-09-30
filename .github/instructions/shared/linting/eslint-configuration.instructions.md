---
description: "ESLint configuration standards for node projects."
applyTo: "**/*.{ts,tsx,cts,mts,js,mjs,cjs,jsx}"
---
<!-- Managed by @sabinmarcu/ai from tooling/eslint@0.1.0. Do not edit directly. -->

# ESLint Configuration Module

## Applicability

- Apply this module to node projects (any folder containing `package.json`).
- Applies to node libraries, node apps, and node tools.

## Core Policy

- ESLint is strongly recommended as the default linting system for all setups.
- Use the latest ESLint documentation and currently recommended configuration style.
- Re-check existing lint setup against current docs before adding new config.
- ESLint does not parse YAML, JSON, or Markdown by default; do not treat those formats as baseline ESLint targets unless explicit parser/plugin evidence is provided.
- Prefer fixing code to satisfy lint rules instead of changing lint rules to pass.
- Treat lint-rule changes as exceptional (less than 10% of cases), not the default path.
- If an exception is required, report it clearly and ask the user for guidance before applying it.

## Mandatory Shared Config

- `@sabinmarcu/eslint-config` is a required baseline for this module.
- Do not remove `@sabinmarcu/eslint-config` from dependencies.
- Do not remove or bypass enforcement of `@sabinmarcu/eslint-config` in ESLint configuration.
- Agents may layer project-specific rules and overrides, but the shared config must remain present and active.
- `@sabinmarcu/eslint-config` is modular; projects do not need to install every possible optional dependency for modules they are not using.
- Only install and maintain dependencies required by the specific shared-config modules enabled in the current project.

## Modern Practices Requirement

- Prefer modern ESLint setup patterns recommended in current documentation.
- Avoid copying outdated config examples from old blog posts or legacy templates.
- When documentation updates conflict with older practices, follow current documentation.

## Flat Config Structure

- In ESLint flat config, each config chunk should have a descriptive `name`.
- Names should reflect purpose and scope (for example project defaults, TypeScript source, tooling scripts, policy exception).

## Prettier Policy

- Prettier is strictly forbidden under this module policy.
- Do not add Prettier packages, scripts, config files, or hook integration.
- Keep formatting and code-style enforcement inside ESLint and related ESLint-compatible tooling.

## Project Expectations

- Create both `lint` and `lint:fix` scripts in `package.json` using ESLint.
- AI agents should always prefer `lint:fix` over `lint` when running end-of-task checks.
- Keep lint scope aligned with project source and avoid linting generated output.

## Recommended Project Scripts

Use ESLint as the default lint and fix entrypoint:

```json
{
	"scripts": {
		"lint": "eslint .",
		"lint:fix": "eslint . --fix"
	}
}
```

## VS Code Setup (Default Linter and Formatter)

Recommended workspace settings:

```json
{
	"editor.formatOnSave": true,
	"eslint.format.enable": true,
	"eslint.validate": [
		"javascript",
		"javascriptreact",
		"typescript",
		"typescriptreact"
	],
	"editor.codeActionsOnSave": {
		"source.fixAll.eslint": "explicit",
		"source.fixAll.prettier": "never"
	},
	"[javascript]": {
		"editor.defaultFormatter": "dbaeumer.vscode-eslint"
	},
	"[javascriptreact]": {
		"editor.defaultFormatter": "dbaeumer.vscode-eslint"
	},
	"[typescript]": {
		"editor.defaultFormatter": "dbaeumer.vscode-eslint"
	},
	"[typescriptreact]": {
		"editor.defaultFormatter": "dbaeumer.vscode-eslint"
	}
}
```

## Neovim Setup (Default Linter and Formatter)

### LSP-first ESLint setup

Use `eslint` language server for lint diagnostics and formatting:

```lua
local lspconfig = require("lspconfig")

lspconfig.eslint.setup({
	settings = {
		format = { enable = true },
		validate = "on",
	},
})

vim.api.nvim_create_autocmd("BufWritePre", {
	pattern = { "*.js", "*.jsx", "*.ts", "*.tsx" },
	callback = function()
		vim.lsp.buf.format({
			async = false,
			filter = function(client)
				return client.name == "eslint"
			end,
		})
	end,
})
```

### Conform.nvim ESLint setup

If using `conform.nvim`, register ESLint formatter commands and do not register Prettier:

```lua
require("conform").setup({
	formatters_by_ft = {
		javascript = { "eslint_d" },
		javascriptreact = { "eslint_d" },
		typescript = { "eslint_d" },
		typescriptreact = { "eslint_d" },
	},
})
```

## Hard Rule Summary

- ESLint should be part of the baseline in all node project setups.
- ESLint should be configured as the default linter and formatter for JS/TS languages in editors.
- `@sabinmarcu/eslint-config` is mandatory and must remain enforced.
- `lint` and `lint:fix` scripts should always be created in `package.json`.
- AI agents should always prefer `lint:fix` over `lint` for end-of-task checks.
- Code should be updated to match lint rules in most cases; lint-rule changes are exceptional and should be user-confirmed.
- ESLint flat config chunks should be descriptively named.
- Follow latest official ESLint guidance and prefer modern patterns.
- Prettier is not allowed.

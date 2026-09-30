---
description: "Editor-level policy to disable Prettier in VS Code and Neovim."
applyTo: "**/*.{json,lua}"
---
<!-- Managed by @sabinmarcu/ai from arch/node-package@0.1.0. Do not edit directly. -->

# Node Package Editor Enforcement: Disable Prettier

Disable Prettier explicitly in editor tooling so it cannot run through extension defaults.

## VS Code

Use workspace settings that block Prettier and prevent EditorConfig-based Prettier inference:

```json
{
  "prettier.enable": false,
  "prettier.requireConfig": true,
  "prettier.useEditorConfig": false,
  "editor.defaultFormatter": "dbaeumer.vscode-eslint",
  "editor.codeActionsOnSave": {
    "source.fixAll.prettier": "never",
    "source.fixAll.eslint": "explicit"
  }
}
```

Operational notes:

- Keep `prettier.enable` set to `false` as the primary lock.
- Keep `prettier.requireConfig` at `true` as an additional guard when users re-enable the extension locally.
- Keep `prettier.useEditorConfig` at `false` so Prettier cannot infer style from `.editorconfig`.

## Neovim

Disable Prettier by not registering any Prettier formatter source in formatter plugins.

Conform example:

```lua
require("conform").setup({
  formatters_by_ft = {
    javascript = { "eslint_d" },
    typescript = { "eslint_d" },
    javascriptreact = { "eslint_d" },
    typescriptreact = { "eslint_d" },
  },
})
```

none-ls example:

```lua
local null_ls = require("null-ls")

null_ls.setup({
  sources = {
    -- Do not register null_ls.builtins.formatting.prettier
    -- Do not register null_ls.builtins.formatting.prettierd
  },
})
```

Operational notes:

- Do not install Prettier-focused Neovim formatter plugins for project formatting.
- Do not register `prettier` or `prettierd` in formatter pipelines.
- Prefer ESLint-based fixes/formatting paths where formatting is required.

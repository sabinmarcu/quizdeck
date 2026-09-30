---
description: "Decision checklist for running TypeScript files with Node.js or tsx."
applyTo: "**/*.{ts,tsx,cts,mts,json}"
---
<!-- Managed by @sabinmarcu/ai from lang/typescript@0.1.0. Do not edit directly. -->

# Native TypeScript Execution

Use this checklist before an AI agent executes a TypeScript script.

## 1. Check the Runtime and Script

- [ ] Run `node --version` or inspect the repository's pinned Node.js version.
- [ ] Inspect the entry file and its imports, not only the entry file.
- [ ] Keep `tsc --noEmit` as a separate typecheck. Neither Node.js type stripping nor `tsx` type-checks before execution.

## 2. Use Node.js Directly Only When Compatible

- [ ] The runtime is Node.js `22.6.0` or newer.
- [ ] The script uses `.ts`, `.mts`, or `.cts`; native execution does not support `.tsx`.
- [ ] Relative imports include explicit file extensions, and type-only imports use `import type`.
- [ ] Module semantics are compatible: `.ts` follows the nearest `package.json` module type, `.mts` is ESM, and `.cts` is CommonJS.
- [ ] The script does not require `tsconfig.json` behavior such as `paths` aliases, downlevel JavaScript, or compiler-driven transformations.
- [ ] The script does not load TypeScript source from under `node_modules`.
- [ ] The execution mode below supports every TypeScript construct in the script and its imports.

For erasable syntax such as type annotations, interfaces, type aliases, and `import type`:

```sh
# Node.js 22.6.0 through 22.17.x
node --experimental-strip-types path/to/script.ts

# Node.js 22.18.0 or newer
node path/to/script.ts
```

For enums, runtime namespaces, parameter properties, or import aliases, Node.js `22.7.0` or newer can generate the required JavaScript with the release-candidate transform flag:

```sh
node --experimental-transform-types path/to/script.ts
```

Do not use native Node.js execution for `.tsx`, decorators, TypeScript syntax in the REPL, syntax-check mode, or `node inspect`. Prefer TypeScript `5.8` or newer with `module: "nodenext"`, `target: "esnext"`, `rewriteRelativeImportExtensions: true`, `verbatimModuleSyntax: true`, and `erasableSyntaxOnly: true` for stripping-only scripts.

## 3. Use `tsx` When Native Execution Is Not Compatible

Use `tsx` when any native-execution checklist item fails, including when Node.js is older than `22.6.0`, the script is `.tsx`, the import graph relies on `tsconfig.json`, or unsupported TypeScript transformations are present.

- [ ] Check whether `tsx` is already declared in the current package or workspace.
- [ ] If `tsx` is installed, use the project-provided binary:

```sh
yarn tsx path/to/script.ts
```

- [ ] If `tsx` is not installed, execute it without changing project dependencies:

```sh
yarn dlx tsx path/to/script.ts
```

- [ ] If the script is a recurring project workflow, add `tsx` as a development dependency and expose the command through a `package.json` script instead of repeatedly using `yarn dlx`.
- [ ] Use a normal TypeScript build instead of either runtime when producing distributable JavaScript or declarations.
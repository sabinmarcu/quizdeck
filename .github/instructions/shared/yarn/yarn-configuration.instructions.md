---
description: "Yarn Modern configuration, linker selection, SDKs, and generated-file policy."
applyTo: "**/{package.json,yarn.lock,.yarnrc.yml,.gitignore,.pnp.cjs,.pnp.loader.mjs}"
---
<!-- Managed by @sabinmarcu/ai from tooling/yarn@0.1.0. Do not edit directly. -->

# Yarn Modern

## Usage

- Use Yarn Berry, also called Yarn Modern or Yarn 2+.
- Use Yarn commands for dependency and script workflows, including `yarn install`, `yarn add`, `yarn remove`, and `yarn run`.
- Prefer Plug'n'Play as Yarn's `nodeLinker`.
- Treat compatibility as more important than preserving Plug'n'Play. Switch to the `node-modules` linker when a dependency, tool, editor, or deployment environment does not work reliably with Plug'n'Play.
- Configure linker selection in `.yarnrc.yml` with either `nodeLinker: pnp` or `nodeLinker: node-modules`.

## Plug'n'Play SDKs

- Regenerate Yarn SDKs whenever a development tool such as TypeScript or ESLint is installed or upgraded:

```sh
yarn dlx @yarnpkg/sdks vscode vim
```

- Commit generated Yarn SDK configuration required by supported editors.

## Plug'n'Play Gitignore

```gitignore
# Installed dependency fallback
node_modules/

# Yarn generated state
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
.pnp.*
```

- Keep `.yarn/cache` ignored unless the repository intentionally uses zero installs.
- Keep `.yarn/sdks` tracked.
- Keep `node_modules/` ignored under Plug'n'Play as a fallback safeguard.

## node_modules Gitignore

```gitignore
# Installed dependencies
node_modules/
```

- Do not add `.yarn` or `.pnp.*` ignore rules for the `node-modules` linker.

## Switching Linkers

- Update `.gitignore` whenever `nodeLinker` changes.
- Remove stale output from the previous linker, run `yarn install`, and regenerate SDKs when enabling Plug'n'Play.
- Remove obsolete tracked generated files from the Git index.
- Review `git status` after installation and confirm ignore rules match the active linker.
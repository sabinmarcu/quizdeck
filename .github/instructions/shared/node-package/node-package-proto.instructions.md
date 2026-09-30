---
description: "Proto toolchain usage and MCP setup for node packages."
applyTo: "**/{.mcp.json,mcp.json,package.json,yarn.lock,.yarnrc.yml}"
---
<!-- Managed by @sabinmarcu/ai from arch/node-package@0.1.0. Do not edit directly. -->

# Proto Toolchain

## Policy

- Use Proto as the preferred toolchain manager for Node.js, Yarn, and other supported development tools.
- Pin Node.js and Yarn in the committed `package.json` `devEngines` field so contributors and automation resolve the same development tool versions.
- Give each `devEngines` entry a `name`, an exact `version`, and `onFail: "error"`. Use `runtime` for Node.js and `packageManager` for Yarn.
- Treat `devEngines` as development environment metadata. Use the separate `engines` field when declaring Node.js versions supported by consumers of a published package.
- Use Proto to install and run Yarn directly. Do not route Yarn through Corepack.

## Tool Invocation

- Inside a repository with pinned tools, invoke the tool itself so Proto's shims and repository configuration resolve the intended version. Use commands such as `yarn`, `node`, and the repository's declared scripts.
- When Yarn Plug'n'Play owns dependency resolution, use `yarn node` for Node.js commands that must resolve packages through the active Plug'n'Play environment.
- Do not wrap ordinary in-repository commands in `proto run` when the repository already defines the tool version.
- Use `proto run` as an exception when executing outside a repository or when the requested tool has no version defined by the repository.
- Prefer an explicit version for exceptional execution outside a repository. An unversioned `proto run` succeeds only when Proto can resolve a version from the environment, local configuration, or global configuration.
- The installed Proto CLI does not provide a `proto yarn` subcommand. Use `proto run yarn [version] -- <args>`.

Example `package.json` configuration:

```json
{
  "devEngines": {
    "runtime": {
      "name": "node",
      "version": "26.5.0",
      "onFail": "error"
    },
    "packageManager": {
      "name": "yarn",
      "version": "4.17.0",
      "onFail": "error"
    }
  }
}
```

## Common Commands

```sh
# Configure Proto for the current shell, then verify the environment.
proto setup
proto diagnose

# Discover versions, pin them in package.json, and install them.
proto versions node
proto pin node 26.5.0 --tool-native
proto pin yarn 4.17.0 --tool-native
proto install node 26.5.0
proto install yarn 4.17.0

# Inspect and maintain the configured toolchain.
proto status
proto outdated

# Prefer direct invocation inside a repository with pinned tools.
node --version
yarn --version
yarn node path/to/script.js

# Outside a repository, use a globally configured version when one exists.
proto run yarn -- --version

# Outside a repository without a configured version, provide one explicitly.
proto run yarn 4.17.0 -- --version
proto run node 26.5.0 -- --version
```

- `proto pin <tool> <version> --tool-native` writes JavaScript tool versions to `package.json` `devEngines`. Do not omit `--tool-native`, because Proto otherwise writes a local `.prototools` file.
- Review the generated `devEngines` entries after pinning and add `onFail: "error"` when it is absent.
- Pass the required version to `proto install <tool> <version>`; do not rely on a project-local `.prototools` file.
- `proto run <tool> -- <args>` resolves a version in this order: an explicit CLI version, `PROTO_VERSION`, local configuration, then global configuration. It exits with an error when none is available.
- `proto run <tool> <version> -- <args>` runs the requested version explicitly and is the safest form outside a configured repository.
- Use `proto status`, `proto outdated`, and `proto diagnose` when checking installation or resolution problems.
- Check `proto <command> --help` before relying on less common flags or changing automated setup.

## Proto MCP

Proto exposes an MCP server through `proto mcp`.

Copilot CLI uses the repository-root `.mcp.json` shape:

```json
{
  "mcpServers": {
    "proto": {
      "type": "stdio",
      "command": "proto",
      "args": ["mcp"]
    }
  }
}
```

If `proto` is not on the default `PATH`, use a repo-local wrapper script:

`.mcp/bin/proto-mcp`

```sh
#!/usr/bin/env sh

PATH="$HOME/.proto/bin:$PATH"
exec proto mcp
```

Then point `.mcp.json` at the wrapper:

```json
{
  "mcpServers": {
    "proto": {
      "type": "stdio",
      "command": "./.mcp/bin/proto-mcp",
      "args": ["mcp"]
    }
  }
}
```

- Run `proto mcp --info` to inspect the available MCP server tools and resources.
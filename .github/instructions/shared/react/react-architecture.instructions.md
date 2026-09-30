---
description: "Renderer-neutral React component, state, model, data, and effect architecture."
applyTo: "**/*.{ts,tsx,js,jsx}"
---
<!-- Managed by @sabinmarcu/ai from arch/react@0.1.0. Do not edit directly. -->

# React Architecture

## Component Ownership

- Keep one primary React component per file.
- Use CamelCase component names and filenames.
- Co-locate a component's styles, tests, and tightly coupled helpers with the component.
- Keep feature-local components under the feature, route, page, or parent that owns them.
- Move a component to a shared component area only after more than one independently owned feature needs the same behavior and API.
- Encode parent-child ownership visibly through a local folder, a filename such as `Parent.Child.tsx`, or a cohesive runtime API such as `Parent.Child`.
- Prefer composition and focused primitives over broad components controlled by many boolean props.

## State Selection

- Use React hooks for state owned by one component.
- Use React hooks plus Context when one parent owns complex state that must be available throughout only that parent's descendant subtree.
- Use Jotai when state is consumed by more than one independently owned component or feature.
- Use Jotai when state must persist for later use through an appropriate storage adapter.
- Use derived atoms for values computed from shared atoms instead of synchronizing duplicate state.
- Do not promote subtree-local state to global atoms merely to avoid a provider.
- Expose focused hooks around Context and nontrivial atom groups so consumers depend on intent rather than storage details.

## Models, Data, and Functions

- Prefer concrete names such as `models`, `state`, `data`, `hooks`, `utils`, and feature concepts.
- Avoid generic enterprise-layer names such as `domain`, `service`, and `manager` when a concrete model or function name communicates the responsibility.
- Keep calculations and transformations in focused functions or model modules outside presentational components.
- Keep remote subscriptions, persistence, and write operations in data modules.
- Validate external and untrusted data at the boundary before exposing it to components or state.
- Keep application-specific content and resource loading out of generic UI components.
- Prefer immutable transformations, derived values, and small functions over stateful classes. Use model classes only when identity, lazy behavior, or cohesive lifecycle semantics make them clearer.

## Effects

- Keep effects narrow and tied to synchronization with an external system.
- Clean up subscriptions, listeners, timers, and asynchronous continuations.
- Derive values during render or in atoms rather than using effects to synchronize duplicate state.
- Keep orchestration out of presentational components; expose focused hooks or providers from the owning feature.

## Public Component Types

- Follow the TypeScript function and namespace declaration-merging guidance for function-owned public types.
- Prefer APIs such as `Component.Props` when the type has no independent meaning outside the component.
- Keep broadly reusable model or data types as standalone exports from the module that owns the concept.

## Interaction Design

- Prefer direct manipulation and local feedback over unnecessary form ceremonies.
- Commit simple, reversible control changes at the interaction that expresses intent.
- Choose explicit confirmation for destructive, transactional, or multi-field changes where partial commits would be surprising.
- Show validation errors at the field or control that owns them instead of relying only on a blocking submit gate.
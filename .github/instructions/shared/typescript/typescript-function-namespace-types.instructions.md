---
description: "Function-owned TypeScript types through declaration merging."
applyTo: "**/*.{ts,tsx}"
---
<!-- Managed by @sabinmarcu/ai from lang/typescript@0.1.0. Do not edit directly. -->

# Function and Namespace Type Merging

## Preferred Pattern

- When a public type belongs exclusively to an exported named function or React component, attach it through a same-named namespace.
- Prefer `Component.Props` over a separate `ComponentProps` export.
- Export the namespace and function under the same identifier so consumers import one API surface.
- Keep the merged namespace focused on types owned by the function. Do not use it as a container for unrelated helpers or mutable runtime state.

```tsx
export namespace Card {
  export type Props = {
    href?: string;
    children?: React.ReactNode;
  };
}

export function Card({ href, children }: Card.Props) {
  return href
    ? <a href={href}>{children}</a>
    : <div>{children}</div>;
}
```

Consumers can import the function and reference its public type through the same symbol:

```ts
import { Card } from './Card';

const props: Card.Props = {
  href: '/projects',
};
```

## Applicability

- Use this pattern for named function declarations when their props, options, result helpers, or related public types are meaningful only in relation to that function.
- Keep broadly reusable types as standalone exports in the module that owns the concept.
- Do not force declaration merging onto anonymous functions or values whose types are shared independently.
- Runtime properties may also be attached deliberately for cohesive component APIs such as `Card.Title`, but runtime composition and type declaration merging are separate decisions.
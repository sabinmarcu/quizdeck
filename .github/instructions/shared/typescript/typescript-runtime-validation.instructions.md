---
description: "TypeScript runtime validation guidance for external data."
applyTo: "**/*.{ts,tsx,cts,mts,js,mjs,cjs}"
---
<!-- Managed by @sabinmarcu/ai from lang/typescript@0.1.0. Do not edit directly. -->

# TypeScript Runtime Validation

## Zod Requirement

- Use `zod` to both type and validate untrusted external data at runtime.
- External data includes API payloads, environment variables, CLI input, and other trust-boundary values.
- Do not rely on TypeScript-only types for external data because they do not validate runtime values.

## Environment Variables Example (`env.ts`)

```ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsedEnv = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
export const env: Env = parsedEnv;
```

## Practical Notes

- Keep schema and parsing close to startup/configuration boundaries.
- Export validated objects and inferred types instead of reading raw `process.env` across the codebase.

# Code Style

Conventions for TypeScript code in `src/` and `tests/`. Enforced by biome where mechanical, by review where judgment-call.

## Prefer functional array methods

```ts
// Avoid
for (let i = 0; i < items.length; i++) { ... }
for (const item of items) { ... }

// Prefer
items.map(item => …)
items.filter(item => …)
items.reduce((acc, item) => …, initial)
items.find(item => …)
items.flatMap(item => …)
```

Exceptions: when traversal needs to mutate an external accumulator with branching control flow that doesn't compose cleanly with `reduce`, a `for…of` loop is fine. Prefer the functional form when both work.

## Discriminated unions over open string types

```ts
// Avoid — `string` collapses with `'arrow'` and breaks narrowing
type Drawing = { kind: 'arrow' | string; ... }

// Prefer — discriminator is a closed literal union; open detail goes elsewhere
type Drawing =
  | { kind: 'arrow'; from: [number, number]; to: [number, number] }
  | { kind: 'geo'; geo: 'rectangle' | 'ellipse' | string; bbox: [number, number, number, number]; ... }
```

## Narrow `unknown` over casting `any`

`any` opts out of typechecking entirely. `unknown` forces narrowing at the use site, which catches drift when a third-party schema changes shape.

```ts
// Avoid
function getStore(snapshot: any): Record<string, any> | null { ... }

// Prefer
function getStore(snapshot: unknown): Record<string, unknown> | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const s = snapshot as { document?: { store?: unknown }; store?: unknown };
  if (s.document?.store && typeof s.document.store === 'object') {
    return s.document.store as Record<string, unknown>;
  }
  ...
}
```

When a legitimate `any` is necessary (untyped third-party schema, non-standard DOM API), document it inline:

```ts
// biome-ignore lint/suspicious/noExplicitAny: caretRangeFromPoint is non-standard but supported in headless Chromium
const range = (document as any).caretRangeFromPoint?.(x, y);
```

## Inline styles use CSS variables, never literal colours

```tsx
// Avoid
<div style={{ color: '#5b6cff', borderRadius: '8px', padding: '14px 28px' }}>

// Prefer
<div style={{
  color: 'var(--accent)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-sm) var(--space-md)',
}}>
```

If the value isn't a token, the token is missing. Add it to `src/styles/tokens.css` first, then use it.

## Auth check at the top of every route

```ts
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // …
}
```

`identify` is the single source of truth — see [`docs/api/auth.md`](api/auth.md). Never reimplement the cookie / Bearer parsing locally.

## Error responses follow the snake_case-code shape

```ts
return NextResponse.json({ error: 'invalid_intent_type' }, { status: 400 });
return NextResponse.json({ error: 'patch_conflict', file: 'index.html' }, { status: 409 });
```

The `error` field is the machine-readable identifier in `snake_case`. Optional fields carry context. Clients match on `error`, never on a human-readable message.

## Service functions return data, throw on bug-class errors

Services in `src/lib/<surface>/service.ts` are the business-logic layer. They:

- Take an input object (named keys, no positional args)
- Return the persisted record(s) on success
- Return `null` for "not found" cases (route handler maps to 404)
- Throw on programmer errors (invariants violated, unreachable branches)

```ts
export async function updateAnnotationTldraw(id: string, snapshot: unknown) {
  const annotation = await prisma.annotation.findUnique({ where: { id } });
  if (!annotation) return null;          // → route returns 404
  // … happy path writes the file and returns the row
  return annotation;
}
```

For typed errors, use a class that the route can `instanceof`-check:

```ts
export class DiffApplyError extends Error {
  constructor(public readonly reason: 'conflict' | 'malformed') {
    super(`diff_apply_failed:${reason}`);
    this.name = 'DiffApplyError';
  }
}
```

## File and folder names

- **Routes** under `src/app/api/<surface>/[…]/route.ts` follow Next.js App Router conventions (`route.ts`, dynamic segments in brackets)
- **Components** live under `src/components/<ComponentName>/<ComponentName>.tsx` — the folder hosts the component file, optional CSS, and tests
- **Lib helpers** under `src/lib/<surface>/<name>.ts` — small focused files, one responsibility per file
- **Tests** under `tests/<unit|integration>/<surface>/<name>.test.ts` mirror the file under test where practical

## Comments

Default to writing none. Add a comment only when the **why** is non-obvious — a hidden constraint, a workaround for a specific bug, a choice that would surprise a reader. Don't comment what the code already says.

```ts
// Avoid
const tldrawAbs = path.join(env().DATA_DIR, annotation.tldrawPath); // build absolute path

// Prefer (comment carries non-obvious intent)
// Invalidate intent sidecar BEFORE writing the new tldraw — readers that
// see the new mtime should never get a stale intent.json with the old key.
deleteIntentCache(annDir);
```

## Prefer pure helpers over service methods on classes

Services are functions that take input and return output. Avoid classes with state — they hide control flow and break tree-shaking. The `DiffApplyError` class is an exception because it composes with `instanceof`.

## Logging

Use `logger` from `src/lib/logger.ts` — structured pino with named children. Don't use `console.log` in `src/`; the lint rule will allow it in `scripts/` since those are one-shot tools.

```ts
import { logger } from '@/lib/logger';
const log = logger.child({ name: 'mockup-service' });
log.info({ mockupId, versionId }, 'version_created');
```

The first argument is structured fields; the second is the human-readable message (a snake_case event name keeps logs greppable).

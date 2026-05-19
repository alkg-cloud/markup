# API Routes

API routes are the only server-side surface in the project — the UI is [client-rendered](../frontend/INDEX.md) and consumes these routes via `fetch`. Routes that read mutable state (cookies, DB rows, files on disk) declare `export const dynamic = 'force-dynamic'`; pure-static routes (none today) do not need it.

## Folder convention

Routes live under `src/app/api/` and follow Next.js App Router rules:

```
src/app/api/<surface>/<resource>/[id]/<sub>/route.ts
```

- Dynamic segments use `[name]` for single-value, `[...rest]` for catch-all
- A `route.ts` file exports `GET`, `POST`, `PUT`, `PATCH`, `DELETE` as named functions
- Folders prefixed with `_` are private and excluded from routing — never use the prefix on a folder containing `route.ts`

## Standard route shape

```ts
import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  // … happy path
  return NextResponse.json(payload, { status: 200 });
}

export const dynamic = 'force-dynamic';
```

The four invariants:

1. Auth check at the top via `identify(req)` — no exceptions
2. `params` is a `Promise` — `await ctx.params` to read it
3. Standard error shape `{ error: 'snake_case_code' }` with HTTP status
4. `export const dynamic = 'force-dynamic'` at the bottom (unless the route is genuinely static)

## Params handling

Next 16 wraps dynamic params in a Promise to allow streaming. Always `await`:

```ts
export async function GET(req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) {
  const { id, vid } = await ctx.params;
  …
}
```

`searchParams` is read off the URL:

```ts
const url = new URL(req.url);
const from = url.searchParams.get('from');
const to = url.searchParams.get('to');
const format = url.searchParams.get('format') ?? 'unified';
```

## Body parsing

| Content-Type | How |
|---|---|
| `application/json` | `await req.json().catch(() => ({}))` then `zod.safeParse` |
| `multipart/form-data` | `await req.formData()` then `fd.get(field)` per field |
| `text/plain` | `await req.text()` |

For JSON bodies, validate with Zod before passing to the service:

```ts
const bodySchema = z.object({
  base_version_id: z.string().min(1),
  patches: z.record(z.string(), z.string()),
});

const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
```

For multipart bodies, do per-field type-guarding:

```ts
const fd = await req.formData();
const screenshot = fd.get('screenshot');
if (!(screenshot instanceof Blob)) {
  return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
}
```

## Error codes

All routes use `{ error: '<snake_case_code>' }` as the JSON body. Conventions:

| Status | Code prefix | Examples |
|---|---|---|
| 400 | `invalid_*` | `invalid_body`, `invalid_intent_type`, `invalid_pin_coords` |
| 401 | `unauthorized` | always exactly this token |
| 403 | `forbidden_*` | `forbidden_role` |
| 404 | `<resource>_not_found` or `not_found` | `not_found`, `base_version_not_found`, `screenshot_missing` |
| 409 | `<verb>_conflict` | `patch_conflict`, `name_exists` |
| 415 | `<noun>_unsupported` | `binary_patch_unsupported` |
| 500 | `internal_*` | rare; reserved for invariant violations |

Optional fields carry context:

```ts
return NextResponse.json(
  { error: 'patch_conflict', file: 'index.html' },
  { status: 409 },
);
```

Clients match on `error`. The optional fields (`file`, `field`, `limit`) are allowed to grow over time and are not part of the primary contract.

## Service delegation

Route handlers stay thin. Business logic lives in `src/lib/<surface>/service.ts`. The route validates input, calls the service, maps the result to a response.

```ts
const result = await createAnnotation({
  mockupId,
  screenshotPng: buf,
  tldrawJson,
  message: messageRaw,
  authorId: id.kind === 'user' ? id.userId : id.tokenId,
  authorType: id.kind,
  pinCoords,
  intentType,
});
return NextResponse.json(
  { id: result.annotation.id, threadId: result.thread.id },
  { status: 201 },
);
```

Service functions return `null` for "not found" cases and throw on programmer errors. The route maps `null` to a 404. See [Code Style](../code-style.md#service-functions-return-data-throw-on-bug-class-errors).

## Direct cross-route imports

The `/agent/context` aggregator imports the `GET` handler from `/annotations/[id]/intent/route.ts` directly and invokes it as a function. This avoids HTTP loopback, which would require `APP_URL` to be reachable from inside the same Node process.

```ts
import { GET as getIntent } from '@/app/api/annotations/[id]/intent/route';

const intentRes = await getIntent(req, { params: Promise.resolve({ id: annotation.id }) });
const intent = intentRes.ok ? await intentRes.json() : null;
```

This is the only sanctioned cross-route import. Other routes do not directly invoke each other.

## Streaming responses

Currently no route streams. When a route needs to stream a large payload (e.g. a future bulk export), use `new NextResponse(readable, { headers: { 'Content-Type': '…' } })` with a Web `ReadableStream`. Document the streaming contract in this file when it lands.

## Caching

Routes that produce expensive payloads use either:

- **Sidecar files** on disk (e.g. `intent.json`, `region.png`) keyed by `(input_mtime, current_version_id)` — see [Storage](storage.md)
- **ETag headers** for in-memory aggregations (e.g. `/agent/context`)

Don't add HTTP `Cache-Control: max-age=…` to mutable resources without thinking through the invalidation path; sidecars + ETag give the same effect with explicit invalidation hooks.

# Testing

## Test layers

| Layer | Tool | Pattern | Purpose |
|---|---|---|---|
| Unit | Vitest | `tests/unit/lib/<surface>/<name>.test.ts` | Pure-function tests; no DB, no FS |
| Integration | Vitest | `tests/integration/<surface>/<name>.test.ts` | Route handlers and services exercised against a real Prisma + filesystem |

Run with `pnpm test` (single run) or `pnpm test:watch`. Coverage is not gated in CI.

## The shared `prisma/test.db` rule

Vitest is configured `fileParallelism: false, maxWorkers: 1` because every integration test runs against the same `prisma/test.db`. Parallel runs would race on row IDs and clobber each other's fixtures.

Each integration test owns the entire DB for the duration of its file. The pattern:

```ts
beforeEach(async () => {
  await prisma.message.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.annotation.deleteMany();
  await prisma.mockupVersion.deleteMany();
  await prisma.mockup.deleteMany();
});
```

Deletion order matters — `Annotation`, `Thread`, `Message` cascade-delete from `Mockup`, but explicit ordering avoids relying on cascade semantics in tests. The `User` and `Session` rows are deleted by tests that need a fresh admin (see [`adminCookie()`](#admincookie-pattern)).

## Test setup (`tests/setup.ts`)

`tests/setup.ts` is loaded by Vitest before every test file. It:

1. Resolves `${TEST_ROOT}` to `<repo>/test-data` and sets `DATA_DIR` to it.
2. Sets `AUTH_SECRET` to a 32+ char dev-only value.
3. Sets `DATABASE_URL=file:${SHARED_TEST_DB}` so Prisma points at `prisma/test.db`.
4. **On first run only** (when `prisma/test.db` doesn't exist), runs `pnpm prisma migrate deploy` to bootstrap the schema.
5. Resets `DATA_DIR` before every test (deletes + recreates).

If you add a Prisma migration, **manually deploy it to the test DB**:

```bash
DATABASE_URL='file:./prisma/test.db' pnpm prisma migrate deploy
```

The bootstrap step in `setup.ts` only fires when the file is missing; it does not catch new migrations on an existing test DB. Forgetting this is the single most common cause of "column X does not exist" test failures after a schema change.

## `adminCookie()` pattern

Every integration test that exercises an authenticated route needs a session cookie. There is no shared helper module — each test file defines its own. The canonical form:

```ts
import { POST as setup } from '@/app/api/auth/setup/route';
import { prisma } from '@/lib/prisma';

async function adminCookie() {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.config.deleteMany();
  const r = await setup(
    new Request('http://l', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@x.com', password: 'longpassword12345', name: 'A' }),
    }),
  );
  return r.headers.get('set-cookie')!.match(/mk_session=([^;]+)/)![1];
}
```

The setup endpoint creates the admin user and returns a `Set-Cookie` header — extract the JWT, then pass it via `headers: { cookie: \`mk_session=${cookie}\` }` on subsequent requests.

For tests that need parallel-safe admin creation (rare; typically only the cross-cutting `coverage-gaps.test.ts`), use a unique email per call:

```ts
const tag = `cov-gaps-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const user = await prisma.user.create({
  data: { email: `${tag}@cov-gaps.x`, /* … */ },
});
const { token } = await createSession(user.id);
return token;
```

## Calling route handlers directly

App Router routes are imported and invoked as functions:

```ts
import { GET } from '@/app/api/annotations/[id]/region/route';
import { POST as createMockupRoute } from '@/app/api/mockups/route';

const res = await GET(
  new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
  { params: Promise.resolve({ id: annotationId }) },
);
expect(res.status).toBe(200);
```

The `params` argument is a `Promise` — match the route's signature literally. `http://l` is a placeholder origin; routes that need the URL build off `req.url` and only the path/query matters.

## FormData in tests

Multipart routes (annotation creation, version upload) take `FormData`. Build it inline:

```ts
const fd = new FormData();
fd.set('screenshot', new Blob([pngBuf], { type: 'image/png' }), 's.png');
fd.set('tldraw', JSON.stringify({ document: { store: {} } }));
fd.set('message', 'msg');
fd.set('intent_type', 'visual');
```

A minimal valid PNG buffer (33 bytes) for tests that don't render the image:

```ts
const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,  // signature
  0, 0, 0, 13, 73, 72, 68, 82,                       // IHDR length + tag
  0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
]);
```

For tests that need real images (`/region.png` crop, puppeteer rendering), use `sharp` to generate a buffer:

```ts
const png = await sharp({
  create: { width: 200, height: 200, channels: 4, background: { r: 100, g: 200, b: 100, alpha: 1 } },
}).png().toBuffer();
```

## Fixtures

- **`tests/fixtures/mockups/valid-simple.zip`** — 28-byte `<html></html>` for tests that just need a valid zip
- **`tests/fixtures/mockups/with-thumbnail.zip`** — minimal HTML + 8-byte PNG (below the 64-byte renderability guard) for testing the thumbnail fallback
- **`tests/fixtures/mockups/lumen-coffee.zip`** / **`helio-pricing.zip`** / **`drone-console.zip`** — elaborate visually-distinct mockups with real screenshots; used for integration-test realism and visual-QA passes

## Puppeteer in tests

The `/api/annotations/[id]/intent` route launches headless Chromium when the annotation has drawings. Tests that exercise the full puppeteer path are slow (3-5s cold start). The integration test for `/intent` (`tests/integration/api/annotations-intent.test.ts`) covers the **cache-hit** and **no-shapes** paths without invoking puppeteer; the full happy path is verified manually against the dev server.

When a future test needs to exercise puppeteer, reuse the singleton from `src/lib/intent/puppeteer.ts` — don't launch a second browser.

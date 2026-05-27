import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/search/route';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Test runs are sequential (maxWorkers: 1) but the user table is not wiped
// between files; the per-suite TAG keeps this file's admin email distinct
// from any other suite that may have created users on the shared test DB.
const TAG = `search-${process.pid}-${Date.now()}`;

async function adminCookie(): Promise<string> {
  const passwordHash = await hashPassword('longpassword12345');
  const user = await prisma.user.create({
    data: { email: `${TAG}@search.x`, name: 'SearchUser', passwordHash, role: 'admin' },
  });
  const { token } = await createSession(user.id);
  return token;
}

function makeReq(qs: string, cookie: string): Request {
  return new Request(`http://localhost/api/search${qs}`, {
    headers: { cookie: `mk_session=${cookie}` },
  });
}

// ---------------------------------------------------------------------------
// search_index FTS5 bootstrap
//
// The FTS5 virtual table is not managed by Prisma migrations — it is a
// runtime artefact that the app creates when the search feature is in use
// (the table name is queried directly via $queryRaw). In tests we create it
// once per suite and populate it with controlled rows so the route's real DB
// path can be exercised without stubs.
// ---------------------------------------------------------------------------

async function ensureSearchIndex(): Promise<void> {
  // CREATE VIRTUAL TABLE IF NOT EXISTS is idempotent across tests that share
  // the same SQLite test.db.
  await prisma.$executeRawUnsafe(`
    CREATE VIRTUAL TABLE IF NOT EXISTS search_index
    USING fts5(
      entity_type,
      entity_id UNINDEXED,
      mockup_id UNINDEXED,
      annotation_id UNINDEXED,
      mockup_slug UNINDEXED,
      mockup_name,
      content
    )
  `);
}

async function clearSearchIndex(): Promise<void> {
  await prisma.$executeRawUnsafe(`DELETE FROM search_index`);
}

/** Insert a single row into the FTS index. */
async function indexMockup(opts: {
  entityId: string;
  mockupId: string;
  mockupSlug: string;
  mockupName: string;
  content: string;
}): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO search_index(entity_type, entity_id, mockup_id, annotation_id, mockup_slug, mockup_name, content)
     VALUES ('mockup', ?, ?, NULL, ?, ?, ?)`,
    opts.entityId,
    opts.mockupId,
    opts.mockupSlug,
    opts.mockupName,
    opts.content,
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('GET /api/search', () => {
  beforeEach(async () => {
    await ensureSearchIndex();
    await clearSearchIndex();
    // Clean up any user rows left by a previous test in this file.
    await prisma.session.deleteMany({ where: { user: { email: { contains: '@search.x' } } } });
    await prisma.user.deleteMany({ where: { email: { contains: '@search.x' } } });
  });

  afterEach(async () => {
    await prisma.session.deleteMany({ where: { user: { email: { contains: '@search.x' } } } });
    await prisma.user.deleteMany({ where: { email: { contains: '@search.x' } } });
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  it('returns 401 without auth', async () => {
    const res = await GET(new Request('http://localhost/api/search?q=test'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
  });

  // ── Zod validation ────────────────────────────────────────────────────────

  it('rejects missing ?q with 400', async () => {
    const cookie = await adminCookie();
    const res = await GET(makeReq('', cookie));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_query');
  });

  it('rejects empty ?q with 400', async () => {
    const cookie = await adminCookie();
    const res = await GET(makeReq('?q=', cookie));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_query');
  });

  it('rejects ?limit=0 with 400 (zod min(1))', async () => {
    const cookie = await adminCookie();
    const res = await GET(makeReq('?q=hello&limit=0', cookie));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_query');
  });

  // NOTE: the zod schema uses .max(50), meaning limit=999 is rejected with 400,
  // NOT silently clamped. The unit test in route.test.ts confirms this
  // expectation (line 79: expects 400 for limit=999).
  it('rejects ?limit beyond 50 with 400 (zod max(50) — not a clamp)', async () => {
    const cookie = await adminCookie();
    const res = await GET(makeReq('?q=hello&limit=999', cookie));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_query');
  });

  // ── Happy path: DB results ────────────────────────────────────────────────

  it('returns empty results array when nothing matches', async () => {
    const cookie = await adminCookie();
    const res = await GET(makeReq('?q=nomatch-xyz', cookie));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.query).toBe('nomatch-xyz');
    expect(body.results).toEqual([]);
  });

  it('returns matching mockup when query matches a mockup name', async () => {
    const cookie = await adminCookie();
    await indexMockup({
      entityId: 'mid-hero',
      mockupId: 'mid-hero',
      mockupSlug: 'hero-landing',
      mockupName: 'Hero Landing',
      content: 'Hero Landing page design',
    });

    const res = await GET(makeReq('?q=Hero+Landing', cookie));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.query).toBe('Hero Landing');
    expect(body.results).toHaveLength(1);
    expect(body.results[0].mockupName).toBe('Hero Landing');
    expect(body.results[0].mockupSlug).toBe('hero-landing');
    expect(body.results[0].type).toBe('mockup');
    expect(body.results[0].annotationId).toBeNull();
  });

  it('returns matching mockup when query matches content', async () => {
    const cookie = await adminCookie();
    await indexMockup({
      entityId: 'mid-pricing',
      mockupId: 'mid-pricing',
      mockupSlug: 'pricing-page',
      mockupName: 'Pricing Page',
      content: 'subscription tiers and billing options',
    });

    const res = await GET(makeReq('?q=subscription', cookie));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].mockupSlug).toBe('pricing-page');
  });

  it('is case-insensitive (search "FOO" matches mockup indexed as "foo-mockup")', async () => {
    const cookie = await adminCookie();
    await indexMockup({
      entityId: 'mid-foo',
      mockupId: 'mid-foo',
      mockupSlug: 'foo-mockup',
      mockupName: 'foo-mockup',
      content: 'foo bar baz',
    });

    const res = await GET(makeReq('?q=FOO', cookie));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].mockupSlug).toBe('foo-mockup');
  });

  it('respects the ?limit parameter and returns at most that many results', async () => {
    const cookie = await adminCookie();
    // Index 5 rows that all match "common"
    for (let i = 1; i <= 5; i++) {
      await indexMockup({
        entityId: `mid-common-${i}`,
        mockupId: `mid-common-${i}`,
        mockupSlug: `common-mockup-${i}`,
        mockupName: `Common Mockup ${i}`,
        content: `common content shared across all five entries number ${i}`,
      });
    }

    const res = await GET(makeReq('?q=common&limit=3', cookie));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.length).toBeLessThanOrEqual(3);
  });

  it('echoes the query string in the response body', async () => {
    const cookie = await adminCookie();
    const res = await GET(makeReq('?q=myquery', cookie));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.query).toBe('myquery');
  });
});

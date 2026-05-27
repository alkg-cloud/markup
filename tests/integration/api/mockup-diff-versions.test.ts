import JSZip from 'jszip';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { GET } from '@/app/api/mockups/[id]/diff-versions/route';
import { POST as createVersion } from '@/app/api/mockups/[id]/version/route';
import { POST as createMockupRoute } from '@/app/api/mockups/route';
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

async function buildZip(files: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function createMockup(cookie: string) {
  const buf = await buildZip({ 'index.html': '<h1>v1</h1>' });
  const fd = new FormData();
  fd.set('name', 'DV');
  fd.set('build', new Blob([new Uint8Array(buf)], { type: 'application/zip' }), 'm.zip');
  const r = await createMockupRoute(
    new Request('http://l', {
      method: 'POST',
      headers: { cookie: `mk_session=${cookie}` },
      body: fd,
    }),
  );
  return r.json();
}

async function uploadVersion(cookie: string, mockupId: string) {
  const buf = await buildZip({ 'index.html': '<h1>v2</h1>' });
  const fd = new FormData();
  fd.set('build', new Blob([new Uint8Array(buf)], { type: 'application/zip' }), 'm.zip');
  const r = await createVersion(
    new Request('http://l', {
      method: 'POST',
      headers: { cookie: `mk_session=${cookie}` },
      body: fd,
    }),
    { params: Promise.resolve({ id: mockupId }) },
  );
  return r.json();
}

describe('GET /api/mockups/[id]/diff-versions', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('returns 401 without auth', async () => {
    const res = await GET(new Request('http://l/?from=a&to=b'), {
      params: Promise.resolve({ id: 'any' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when mockup does not exist', async () => {
    const cookie = await adminCookie();
    const res = await GET(
      new Request('http://l/?from=a&to=b', {
        headers: { cookie: `mk_session=${cookie}` },
      }),
      { params: Promise.resolve({ id: 'non-existent-id' }) },
    );
    expect(res.status).toBe(404);
  });

  it('returns kind:invalid with viewerHref when no query params provided', async () => {
    // Route passes null from/to → resolveDiffParams returns kind:invalid
    const cookie = await adminCookie();
    const m = await createMockup(cookie);
    const res = await GET(
      new Request('http://l/', {
        headers: { cookie: `mk_session=${cookie}` },
      }),
      { params: Promise.resolve({ id: m.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe('invalid');
    expect(typeof body.viewerHref).toBe('string');
  });

  it('returns kind:ok with version timestamps when valid from and to are given', async () => {
    const cookie = await adminCookie();
    const m = await createMockup(cookie);
    const v2 = await uploadVersion(cookie, m.id);
    const res = await GET(
      new Request(`http://l/?from=${m.currentVersionId}&to=${v2.id}`, {
        headers: { cookie: `mk_session=${cookie}` },
      }),
      { params: Promise.resolve({ id: m.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe('ok');
    expect(body.from.id).toBe(m.currentVersionId);
    expect(body.to.id).toBe(v2.id);
    expect(typeof body.from.createdAt).toBe('string');
    expect(typeof body.to.createdAt).toBe('string');
    expect(typeof body.viewerHref).toBe('string');
  });

  it('returns kind:invalid with viewerHref when from is an unknown version id', async () => {
    // Route resolves unknown id → resolveDiffParams returns kind:invalid (200, not 400)
    const cookie = await adminCookie();
    const m = await createMockup(cookie);
    const res = await GET(
      new Request(`http://l/?from=unknown-version-id&to=${m.currentVersionId}`, {
        headers: { cookie: `mk_session=${cookie}` },
      }),
      { params: Promise.resolve({ id: m.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe('invalid');
    expect(typeof body.viewerHref).toBe('string');
  });

  it('returns kind:invalid with viewerHref when only one query param is provided', async () => {
    // resolveDiffParams requires both from and to; a missing param yields kind:invalid
    const cookie = await adminCookie();
    const m = await createMockup(cookie);
    const res = await GET(
      new Request(`http://l/?from=${m.currentVersionId}`, {
        headers: { cookie: `mk_session=${cookie}` },
      }),
      { params: Promise.resolve({ id: m.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe('invalid');
  });
});

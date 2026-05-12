import JSZip from 'jszip';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { GET } from '@/app/api/mockups/[id]/diff/route';
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

async function createMockup(cookie: string, indexHtml: string) {
  const buf = await buildZip({ 'index.html': indexHtml });
  const fd = new FormData();
  fd.set('name', 'D');
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

async function uploadVersion(cookie: string, mockupId: string, indexHtml: string) {
  const buf = await buildZip({ 'index.html': indexHtml });
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

describe('GET /api/mockups/[id]/diff', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('returns unified diff between two versions', async () => {
    const cookie = await adminCookie();
    const m = await createMockup(cookie, 'a\nb\n');
    const v2 = await uploadVersion(cookie, m.id, 'a\nB\n');
    const res = await GET(
      new Request(`http://l/?from=${m.currentVersionId}&to=${v2.id}&format=unified`, {
        headers: { cookie: `mk_session=${cookie}` },
      }),
      { params: Promise.resolve({ id: m.id }) },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/plain/);
    const text = await res.text();
    expect(text).toMatch(/^-b$/m);
    expect(text).toMatch(/^\+B$/m);
  });

  it('returns empty body when no changes', async () => {
    const cookie = await adminCookie();
    const m = await createMockup(cookie, 'a\n');
    const v2 = await uploadVersion(cookie, m.id, 'a\n');
    const res = await GET(
      new Request(`http://l/?from=${m.currentVersionId}&to=${v2.id}`, {
        headers: { cookie: `mk_session=${cookie}` },
      }),
      { params: Promise.resolve({ id: m.id }) },
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
  });

  it('returns json body when format=json', async () => {
    const cookie = await adminCookie();
    const m = await createMockup(cookie, 'a\nb\n');
    const v2 = await uploadVersion(cookie, m.id, 'a\nB\n');
    const res = await GET(
      new Request(`http://l/?from=${m.currentVersionId}&to=${v2.id}&format=json`, {
        headers: { cookie: `mk_session=${cookie}` },
      }),
      { params: Promise.resolve({ id: m.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.from).toBe(m.currentVersionId);
    expect(body.to).toBe(v2.id);
    expect(body.diff).toMatch(/^-b$/m);
  });

  it('returns 400 when from/to missing', async () => {
    const cookie = await adminCookie();
    const m = await createMockup(cookie, 'a\n');
    const res = await GET(
      new Request(`http://l/`, {
        headers: { cookie: `mk_session=${cookie}` },
      }),
      { params: Promise.resolve({ id: m.id }) },
    );
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await GET(new Request('http://l/?from=a&to=b'), {
      params: Promise.resolve({ id: 'any' }),
    });
    expect(res.status).toBe(401);
  });
});

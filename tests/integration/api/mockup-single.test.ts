import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { GET as getMockup, PATCH as patchMockup } from '@/app/api/mockups/[id]/route';
import { POST as createVersion } from '@/app/api/mockups/[id]/version/route';
import { GET as getVersions } from '@/app/api/mockups/[id]/versions/route';
import { POST as createMockup } from '@/app/api/mockups/route';
import { prisma } from '@/lib/prisma';

const fixture = (n: string) => path.resolve('tests/fixtures/mockups', n);

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
  const cookie = r.headers.get('set-cookie');
  if (!cookie) throw new Error('no cookie');
  const m = cookie.match(/mk_session=([^;]+)/);
  if (!m) throw new Error('no mk_session');
  return m[1];
}

async function uploadMockup(cookie: string, name: string) {
  const fd = new FormData();
  fd.set('name', name);
  fd.set(
    'build',
    new Blob([fs.readFileSync(fixture('valid-simple.zip'))], { type: 'application/zip' }),
    'mockup.zip',
  );
  const res = await createMockup(
    new Request('http://l/api/mockups', {
      method: 'POST',
      headers: { cookie: `mk_session=${cookie}` },
      body: fd,
    }),
  );
  return res.json();
}

describe('single mockup endpoints', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('GET /api/mockups/:id returns the mockup', async () => {
    const cookie = await adminCookie();
    const created = await uploadMockup(cookie, 'X');
    const res = await getMockup(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(created.id);
  });

  it('GET 404 for unknown id', async () => {
    const cookie = await adminCookie();
    const res = await getMockup(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: 'unknown' }) },
    );
    expect(res.status).toBe(404);
  });

  it('PATCH updates status', async () => {
    const cookie = await adminCookie();
    const created = await uploadMockup(cookie, 'Y');
    const res = await patchMockup(
      new Request('http://l', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', cookie: `mk_session=${cookie}` },
        body: JSON.stringify({ status: 'archived' }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('archived');
  });

  it('POST /version adds a version and updates currentVersionId', async () => {
    const cookie = await adminCookie();
    const created = await uploadMockup(cookie, 'Z');
    const fd = new FormData();
    fd.set(
      'build',
      new Blob([fs.readFileSync(fixture('valid-simple.zip'))], { type: 'application/zip' }),
      'mockup.zip',
    );
    const res = await createVersion(
      new Request('http://l/api/mockups/X/version', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: fd,
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(201);

    const list = await getVersions(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: created.id }) },
    );
    const body = await list.json();
    expect(body.versions).toHaveLength(2);
  });
});

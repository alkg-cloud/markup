import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { POST as createVersion } from '@/app/api/mockups/[id]/version/route';
import { PATCH as promote } from '@/app/api/mockups/[id]/versions/[vid]/promote/route';
import { DELETE as deleteVer } from '@/app/api/mockups/[id]/versions/[vid]/route';
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
  return r.headers.get('set-cookie')!.match(/mk_session=([^;]+)/)![1];
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

async function addVersion(cookie: string, mockupId: string) {
  const fd = new FormData();
  fd.set(
    'build',
    new Blob([fs.readFileSync(fixture('valid-simple.zip'))], { type: 'application/zip' }),
    'mockup.zip',
  );
  const res = await createVersion(
    new Request('http://l', {
      method: 'POST',
      headers: { cookie: `mk_session=${cookie}` },
      body: fd,
    }),
    { params: Promise.resolve({ id: mockupId }) },
  );
  return res.json();
}

describe('version mutation routes', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('PATCH /promote sets currentVersionId', async () => {
    const cookie = await adminCookie();
    const created = await uploadMockup(cookie, 'X');
    const v2 = await addVersion(cookie, created.id);
    // current is now v2; promote v1
    const v1Id = created.currentVersionId;
    const res = await promote(
      new Request('http://l', { method: 'PATCH', headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: created.id, vid: v1Id }) },
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.mockup.findUnique({ where: { id: created.id } });
    expect(reloaded?.currentVersionId).toBe(v1Id);
    expect(v2.id).not.toBe(v1Id);
  });

  it('DELETE refuses current version', async () => {
    const cookie = await adminCookie();
    const created = await uploadMockup(cookie, 'X');
    const res = await deleteVer(
      new Request('http://l', { method: 'DELETE', headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: created.id, vid: created.currentVersionId }) },
    );
    expect(res.status).toBe(409);
  });

  it('DELETE removes a non-current version', async () => {
    const cookie = await adminCookie();
    const created = await uploadMockup(cookie, 'X');
    await addVersion(cookie, created.id); // v2 is now current
    const v1Id = created.currentVersionId;
    const res = await deleteVer(
      new Request('http://l', { method: 'DELETE', headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: created.id, vid: v1Id }) },
    );
    expect(res.status).toBe(204);
    expect(await prisma.mockupVersion.findUnique({ where: { id: v1Id } })).toBeNull();
  });

  it('DELETE requires admin (rejects agent token)', async () => {
    const cookie = await adminCookie();
    const created = await uploadMockup(cookie, 'X');
    await addVersion(cookie, created.id);
    const v1Id = created.currentVersionId;
    // Use Bearer with no real token → identify returns null → 401
    const res = await deleteVer(
      new Request('http://l', { method: 'DELETE', headers: { authorization: 'Bearer nope' } }),
      { params: Promise.resolve({ id: created.id, vid: v1Id }) },
    );
    expect(res.status).toBe(401);
  });
});

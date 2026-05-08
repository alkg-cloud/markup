import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { POST as createMockup, GET as listMockups } from '@/app/api/mockups/route';
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
  const cookieHeader = r.headers.get('set-cookie');
  if (!cookieHeader) throw new Error('no cookie');
  const m = cookieHeader.match(/mk_session=([^;]+)/);
  if (!m) throw new Error('no mk_session');
  return m[1];
}

async function multipart(zip: string, name: string) {
  const fd = new FormData();
  fd.set('name', name);
  fd.set('build', new Blob([fs.readFileSync(zip)], { type: 'application/zip' }), 'mockup.zip');
  return fd;
}

describe('POST /api/mockups', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('creates a mockup from a valid zip with admin cookie', async () => {
    const cookie = await adminCookie();
    const fd = await multipart(fixture('valid-simple.zip'), 'My Mockup');
    const res = await createMockup(
      new Request('http://l/api/mockups', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: fd,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.currentVersionId).toBeDefined();
  });

  it('rejects unauthenticated', async () => {
    const fd = await multipart(fixture('valid-simple.zip'), 'X');
    const res = await createMockup(
      new Request('http://l/api/mockups', { method: 'POST', body: fd }),
    );
    expect(res.status).toBe(401);
  });

  it('lists with archived hidden by default', async () => {
    const cookie = await adminCookie();
    const fd = await multipart(fixture('valid-simple.zip'), 'A');
    await createMockup(
      new Request('http://l/api/mockups', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: fd,
      }),
    );
    const fd2 = await multipart(fixture('valid-simple.zip'), 'B');
    const r2 = await createMockup(
      new Request('http://l/api/mockups', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: fd2,
      }),
    );
    const id2 = (await r2.json()).id;
    await prisma.mockup.update({ where: { id: id2 }, data: { status: 'archived' } });
    const list = await listMockups(
      new Request('http://l/api/mockups', { headers: { cookie: `mk_session=${cookie}` } }),
    );
    const items = (await list.json()).items;
    expect(items).toHaveLength(1);
  });
});

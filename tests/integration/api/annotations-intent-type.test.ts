import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { POST as createAnnotation } from '@/app/api/mockups/[id]/annotations/route';
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

async function createBaseMockup(cookie: string) {
  const fd = new FormData();
  fd.set('name', 'M');
  fd.set(
    'build',
    new Blob([fs.readFileSync(fixture('valid-simple.zip'))], { type: 'application/zip' }),
    'm.zip',
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

function annFormData(overrides: Record<string, string> = {}) {
  const ann = new FormData();
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0,
    0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
  ]);
  ann.set('screenshot', new Blob([png], { type: 'image/png' }), 's.png');
  ann.set('tldraw', JSON.stringify({ document: { store: {} } }));
  ann.set('message', 'msg');
  for (const [k, v] of Object.entries(overrides)) ann.set(k, v);
  return ann;
}

describe('POST /api/mockups/[id]/annotations — intent_type', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it.each(['visual', 'copy', 'behavior', 'other'])('accepts intent_type=%s', async (kind) => {
    const cookie = await adminCookie();
    const created = await createBaseMockup(cookie);
    const res = await createAnnotation(
      new Request('http://l', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: annFormData({ intent_type: kind }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    const ann = await prisma.annotation.findUnique({ where: { id: body.id } });
    expect(ann?.intentType).toBe(kind);
  });

  it('rejects invalid intent_type with 400 invalid_intent_type', async () => {
    const cookie = await adminCookie();
    const created = await createBaseMockup(cookie);
    const res = await createAnnotation(
      new Request('http://l', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: annFormData({ intent_type: 'nonsense' }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_intent_type');
  });

  it('defaults intentType to "other" when omitted', async () => {
    const cookie = await adminCookie();
    const created = await createBaseMockup(cookie);
    const res = await createAnnotation(
      new Request('http://l', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: annFormData(),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    const ann = await prisma.annotation.findUnique({ where: { id: body.id } });
    expect(ann?.intentType).toBe('other');
    expect(ann?.createdOnVersionId).toBeTruthy();
  });
});

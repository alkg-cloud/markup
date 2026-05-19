import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { POST as createVersion } from '@/app/api/mockups/[id]/version/route';
import { POST as createMockup } from '@/app/api/mockups/route';
import { resolveDiffParams } from '@/lib/mockup/diff-resolve';
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

describe('diff page param resolution', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('returns both versions when both ids are valid', async () => {
    const cookie = await adminCookie();
    const fd = new FormData();
    fd.set('name', 'M');
    fd.set(
      'build',
      new Blob([fs.readFileSync(fixture('valid-simple.zip'))], { type: 'application/zip' }),
      'm.zip',
    );
    const created = await (
      await createMockup(
        new Request('http://l/api/mockups', {
          method: 'POST',
          headers: { cookie: `mk_session=${cookie}` },
          body: fd,
        }),
      )
    ).json();
    const v2Fd = new FormData();
    v2Fd.set(
      'build',
      new Blob([fs.readFileSync(fixture('valid-simple.zip'))], { type: 'application/zip' }),
      'm.zip',
    );
    const v2 = await (
      await createVersion(
        new Request('http://l', {
          method: 'POST',
          headers: { cookie: `mk_session=${cookie}` },
          body: v2Fd,
        }),
        { params: Promise.resolve({ id: created.id }) },
      )
    ).json();

    const res = await resolveDiffParams(created.id, created.currentVersionId, v2.id);
    expect(res.kind).toBe('ok');
    if (res.kind === 'ok') {
      expect(res.from.id).toBe(created.currentVersionId);
      expect(res.to.id).toBe(v2.id);
    }
  });

  it('returns kind:invalid when from is unknown', async () => {
    const cookie = await adminCookie();
    const fd = new FormData();
    fd.set('name', 'M');
    fd.set(
      'build',
      new Blob([fs.readFileSync(fixture('valid-simple.zip'))], { type: 'application/zip' }),
      'm.zip',
    );
    const created = await (
      await createMockup(
        new Request('http://l/api/mockups', {
          method: 'POST',
          headers: { cookie: `mk_session=${cookie}` },
          body: fd,
        }),
      )
    ).json();
    const res = await resolveDiffParams(created.id, 'unknown', created.currentVersionId);
    expect(res.kind).toBe('invalid');
  });
});

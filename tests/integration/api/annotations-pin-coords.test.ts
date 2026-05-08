import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { GET as getAnnotation } from '@/app/api/annotations/[id]/route';
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

describe('annotations route — pinCoords', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('accepts and persists pinCoords field', async () => {
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

    const ann = new FormData();
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, /* dummy IHDR */ 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
    ]);
    ann.set('screenshot', new Blob([png], { type: 'image/png' }), 's.png');
    ann.set('tldraw', JSON.stringify({ schema: 'x', records: [] }));
    ann.set('message', 'pin me');
    ann.set(
      'pinCoords',
      JSON.stringify({
        scrollX: 0,
        scrollY: 100,
        viewportWidth: 1280,
        viewportHeight: 800,
        bboxX: 50,
        bboxY: 60,
        bboxW: 30,
        bboxH: 20,
      }),
    );

    const res = await createAnnotation(
      new Request('http://l', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: ann,
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(201);
    const body = await res.json();

    const detail = await getAnnotation(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: body.id }) },
    );
    const detailBody = await detail.json();
    expect(detailBody.pinCoords).toEqual({
      scrollX: 0,
      scrollY: 100,
      viewportWidth: 1280,
      viewportHeight: 800,
      bboxX: 50,
      bboxY: 60,
      bboxW: 30,
      bboxH: 20,
    });
  });

  it('rejects malformed pinCoords with 400', async () => {
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

    const ann = new FormData();
    ann.set(
      'screenshot',
      new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }),
      's.png',
    );
    ann.set('tldraw', JSON.stringify({}));
    ann.set('message', 'x');
    ann.set('pinCoords', 'not-json');

    const res = await createAnnotation(
      new Request('http://l', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: ann,
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_pin_coords');
  });

  it('omitting pinCoords is fine (null persisted)', async () => {
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

    const ann = new FormData();
    ann.set(
      'screenshot',
      new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }),
      's.png',
    );
    ann.set('tldraw', JSON.stringify({}));
    ann.set('message', 'x');

    const res = await createAnnotation(
      new Request('http://l', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: ann,
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    const detail = await (
      await getAnnotation(
        new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
        { params: Promise.resolve({ id: body.id }) },
      )
    ).json();
    expect(detail.pinCoords).toBeNull();
  });
});

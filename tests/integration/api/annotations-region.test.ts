import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/annotations/[id]/region/route';
import { POST as setup } from '@/app/api/auth/setup/route';
import { createAnnotation } from '@/lib/annotation/service';
import { env } from '@/lib/env';
import { createMockupFromZip } from '@/lib/mockup/service';
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

async function makeAnnotation(opts: { withPinCoords: boolean }) {
  const m = await createMockupFromZip({
    name: 'Region',
    zipPath: fixture('valid-simple.zip'),
    createdBy: 'u',
    createdByType: 'user',
  });
  const png = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 4,
      background: { r: 100, g: 200, b: 100, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const r = await createAnnotation({
    mockupId: m.mockup.id,
    screenshotPng: png,
    tldrawJson: { document: { store: {} } },
    message: 'msg',
    authorId: 'u',
    authorType: 'user',
    pinCoords: opts.withPinCoords
      ? {
          scrollX: 0,
          scrollY: 0,
          viewportWidth: 200,
          viewportHeight: 200,
          bboxX: 50,
          bboxY: 50,
          bboxW: 80,
          bboxH: 60,
        }
      : null,
  });
  return { annotationId: r.annotation.id, screenshotPath: r.annotation.screenshotPath };
}

describe('GET /api/annotations/[id]/region', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('returns cropped PNG and writes sidecar', async () => {
    const cookie = await adminCookie();
    const { annotationId, screenshotPath } = await makeAnnotation({ withPinCoords: true });
    const res = await GET(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: annotationId }) },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(64);
    const meta = await sharp(buf).metadata();
    // 80x60 + 20 padding each side, no clamping needed in 200x200 image
    expect(meta.width).toBe(120);
    expect(meta.height).toBe(100);

    // Sidecar exists
    const annDir = path.dirname(path.join(env().DATA_DIR, screenshotPath));
    expect(fs.existsSync(path.join(annDir, 'region.png'))).toBe(true);
  });

  it('returns 404 when annotation has no pin coords', async () => {
    const cookie = await adminCookie();
    const { annotationId } = await makeAnnotation({ withPinCoords: false });
    const res = await GET(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: annotationId }) },
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('no_pin_coords');
  });

  it('returns 401 without auth', async () => {
    const { annotationId } = await makeAnnotation({ withPinCoords: true });
    const res = await GET(new Request('http://l'), {
      params: Promise.resolve({ id: annotationId }),
    });
    expect(res.status).toBe(401);
  });

  it('reuses cached sidecar on second call', async () => {
    const cookie = await adminCookie();
    const { annotationId, screenshotPath } = await makeAnnotation({ withPinCoords: true });
    await GET(new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }), {
      params: Promise.resolve({ id: annotationId }),
    });
    const annDir = path.dirname(path.join(env().DATA_DIR, screenshotPath));
    const sidecar = path.join(annDir, 'region.png');
    const mtime1 = fs.statSync(sidecar).mtimeMs;
    // Brief wait so mtime would differ if regenerated
    await new Promise((r) => setTimeout(r, 50));
    await GET(new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }), {
      params: Promise.resolve({ id: annotationId }),
    });
    const mtime2 = fs.statSync(sidecar).mtimeMs;
    expect(mtime2).toBe(mtime1);
  });
});

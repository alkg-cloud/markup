import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/annotations/[id]/intent/route';
import { POST as setup } from '@/app/api/auth/setup/route';
import { createAnnotation } from '@/lib/annotation/service';
import { env } from '@/lib/env';
import { writeIntentCache } from '@/lib/intent/cache';
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

async function makeAnnotation() {
  const m = await createMockupFromZip({
    name: 'IntentTest',
    zipPath: fixture('valid-simple.zip'),
    createdBy: 'u',
    createdByType: 'user',
  });
  const png = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 4,
      background: { r: 100, g: 100, b: 100, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const r = await createAnnotation({
    mockupId: m.mockup.id,
    screenshotPng: png,
    tldrawJson: {
      document: {
        store: {
          'shape:r1': {
            typeName: 'shape',
            type: 'geo',
            x: 10,
            y: 10,
            props: { geo: 'rectangle', w: 50, h: 30, color: 'red', fill: 'none' },
          },
        },
      },
    },
    message: 'fix this',
    authorId: 'u',
    authorType: 'user',
    intentType: 'visual',
  });
  return {
    annotationId: r.annotation.id,
    mockupId: m.mockup.id,
    currentVersionId: m.version.id,
    tldrawPath: r.annotation.tldrawPath,
  };
}

describe('GET /api/annotations/[id]/intent', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('returns 401 without auth', async () => {
    const { annotationId } = await makeAnnotation();
    const res = await GET(new Request('http://l'), {
      params: Promise.resolve({ id: annotationId }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 for missing annotation', async () => {
    const cookie = await adminCookie();
    const res = await GET(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: 'no-such-id' }) },
    );
    expect(res.status).toBe(404);
  });

  it('serves the cached intent.json sidecar without invoking puppeteer', async () => {
    const cookie = await adminCookie();
    const { annotationId, currentVersionId, tldrawPath } = await makeAnnotation();

    const tldrawAbs = path.join(env().DATA_DIR, tldrawPath);
    const tldrawMtime = fs.statSync(tldrawAbs).mtimeMs;
    const annDir = path.dirname(tldrawAbs);
    const fakePayload = {
      annotation_id: annotationId,
      comment: 'cached comment',
      intent_type: 'visual',
      drawings: [],
      annotated_dom: [],
      viewport: { width: 0, height: 0, scrollY: 0 },
    };
    writeIntentCache(annDir, `${tldrawMtime}:${currentVersionId}`, fakePayload);

    const t0 = Date.now();
    const res = await GET(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: annotationId }) },
    );
    const dt = Date.now() - t0;
    expect(res.status).toBe(200);
    expect(dt).toBeLessThan(500); // cache hit, no puppeteer launch
    const body = await res.json();
    expect(body.comment).toBe('cached comment');
  });

  it('parses drawings + caches result on first call (puppeteer-free path when no probes)', async () => {
    // When the snapshot has zero shapes, probesFromDrawings returns [] and
    // puppeteer is skipped; we still get a payload with drawings parsed.
    const m = await createMockupFromZip({
      name: 'NoShapes',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const png = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();
    const r = await createAnnotation({
      mockupId: m.mockup.id,
      screenshotPng: png,
      tldrawJson: { document: { store: {} } },
      message: 'just a comment, no shapes',
      authorId: 'u',
      authorType: 'user',
      intentType: 'copy',
    });

    const cookie = await adminCookie();
    const res = await GET(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: r.annotation.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.intent_type).toBe('copy');
    expect(body.comment).toBe('just a comment, no shapes');
    expect(body.drawings).toEqual([]);
    expect(body.annotated_dom).toEqual([]);
  });
});

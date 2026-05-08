import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DELETE as revokeAgentToken } from '@/app/api/agent-tokens/[id]/route';
import { POST as createAgentToken } from '@/app/api/agent-tokens/route';
import { GET as getAnnotation } from '@/app/api/annotations/[id]/route';
import { GET as getScreenshot } from '@/app/api/annotations/[id]/screenshot/route';
import { POST as createAnnotation } from '@/app/api/mockups/[id]/annotations/route';
import { GET as getThumbnail, POST as setThumbnail } from '@/app/api/mockups/[id]/thumbnail/route';
import { POST as createVersion } from '@/app/api/mockups/[id]/version/route';
import { GET as getVersionSource } from '@/app/api/mockups/[id]/versions/[vid]/source/route';
import { POST as createMockup } from '@/app/api/mockups/route';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

const fixture = (n: string) => path.resolve('tests/fixtures/mockups', n);

async function adminCookie() {
  // Bypass the setup() endpoint (which races against parallel test files on
  // the shared isSetupCompleted Config flag). Create a fresh admin + session
  // directly via Prisma each call. Cookie is just the session JWT.
  const tag = `cov-gaps-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await hashPassword('longpassword12345');
  const user = await prisma.user.create({
    data: { email: `${tag}@cov-gaps.x`, name: 'CovGaps', passwordHash, role: 'admin' },
  });
  const { token } = await createSession(user.id);
  return token;
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

describe('coverage gaps — uncovered route handlers', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
    await prisma.agentToken.deleteMany();
  });

  afterEach(async () => {
    // Clean up the per-call admin users this file created so they don't
    // collide with parallel/sequential tests sharing the same SQLite test DB.
    await prisma.session.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: '@cov-gaps.x' } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: '@cov-gaps.x' } } });
  });

  describe('agent-tokens/[id] DELETE (revoke)', () => {
    it('admin can revoke a token by id', async () => {
      const cookie = await adminCookie();
      const created = await createAgentToken(
        new Request('http://l', {
          method: 'POST',
          headers: { 'content-type': 'application/json', cookie: `mk_session=${cookie}` },
          body: JSON.stringify({ name: 'soon-to-die' }),
        }),
      );
      const createBody = await created.json();
      const tokenId = createBody.id;
      expect(tokenId).toBeDefined();
      const res = await revokeAgentToken(
        new Request('http://l', {
          method: 'DELETE',
          headers: { cookie: `mk_session=${cookie}` },
        }),
        { params: Promise.resolve({ id: tokenId }) },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(await prisma.agentToken.findUnique({ where: { id: tokenId } })).toBeNull();
    });

    it('rejects unauthenticated', async () => {
      const cookie = await adminCookie();
      const t = await prisma.agentToken.create({
        data: { id: 'tk1', name: 'x', tokenHash: 'unused' },
      });
      const res = await revokeAgentToken(new Request('http://l', { method: 'DELETE' }), {
        params: Promise.resolve({ id: t.id }),
      });
      expect(res.status).toBe(401);
      void cookie;
    });
  });

  describe('annotations/[id] GET', () => {
    it('returns the annotation row including parsed pinCoords', async () => {
      const cookie = await adminCookie();
      const created = await uploadMockup(cookie, 'M');
      const fd = new FormData();
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      fd.set('screenshot', new Blob([png], { type: 'image/png' }), 's.png');
      fd.set('tldraw', JSON.stringify({ schema: 'x', records: [] }));
      fd.set('message', 'msg');
      fd.set(
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
      const ar = await createAnnotation(
        new Request('http://l', {
          method: 'POST',
          headers: { cookie: `mk_session=${cookie}` },
          body: fd,
        }),
        { params: Promise.resolve({ id: created.id }) },
      );
      const arBody = await ar.json();
      const detail = await getAnnotation(
        new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
        { params: Promise.resolve({ id: arBody.id }) },
      );
      expect(detail.status).toBe(200);
      const body = await detail.json();
      expect(body.id).toBe(arBody.id);
      expect(body.thread).toBeTruthy();
      expect(body.thread.messages.length).toBe(1);
      expect(body.pinCoords).toMatchObject({ bboxX: 50, bboxY: 60 });
      expect(body.tldraw).toBeTruthy();
    });

    it('404s an unknown id', async () => {
      const cookie = await adminCookie();
      const res = await getAnnotation(
        new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
        { params: Promise.resolve({ id: 'nope' }) },
      );
      expect(res.status).toBe(404);
    });
  });

  describe('annotations/[id]/screenshot GET', () => {
    it('streams the PNG bytes', async () => {
      const cookie = await adminCookie();
      const created = await uploadMockup(cookie, 'M');
      const fd = new FormData();
      const png = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
        0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
      ]);
      fd.set('screenshot', new Blob([png], { type: 'image/png' }), 's.png');
      fd.set('tldraw', JSON.stringify({}));
      fd.set('message', 'pic');
      const ar = await createAnnotation(
        new Request('http://l', {
          method: 'POST',
          headers: { cookie: `mk_session=${cookie}` },
          body: fd,
        }),
        { params: Promise.resolve({ id: created.id }) },
      );
      const aid = (await ar.json()).id;
      const res = await getScreenshot(
        new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
        { params: Promise.resolve({ id: aid }) },
      );
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/png');
      const buf = Buffer.from(await res.arrayBuffer());
      expect(buf.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
    });

    it('rejects unauthenticated', async () => {
      const res = await getScreenshot(new Request('http://l'), {
        params: Promise.resolve({ id: 'nope' }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('mockups/[id]/thumbnail', () => {
    it('GET returns the thumbnail PNG when present', async () => {
      const cookie = await adminCookie();
      const created = await uploadMockup(cookie, 'M');
      // Real (decodable) 1×1 PNG with full chunks — magic + IHDR + IDAT +
      // IEND ≈ 73 bytes, comfortably above the route's 64-byte
      // renderability guard.
      const png = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0xf8,
        0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02, 0xfe, 0xa3, 0xeb, 0x23, 0x7e, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const fd = new FormData();
      fd.set('thumbnail', new Blob([png], { type: 'image/png' }), 't.png');
      const setRes = await setThumbnail(
        new Request('http://l', {
          method: 'POST',
          headers: { cookie: `mk_session=${cookie}` },
          body: fd,
        }),
        { params: Promise.resolve({ id: created.id }) },
      );
      expect(setRes.status).toBe(200);
      const getRes = await getThumbnail(new Request('http://l'), {
        params: Promise.resolve({ id: created.id }),
      });
      expect(getRes.status).toBe(200);
      expect(getRes.headers.get('content-type')).toBe('image/png');
    });

    it('GET 404s when no thumbnail exists', async () => {
      const cookie = await adminCookie();
      const created = await uploadMockup(cookie, 'M');
      // Remove any auto-generated thumbnail
      try {
        const { env } = await import('@/lib/env');
        const { thumbnailPath } = await import('@/lib/mockup/storage');
        const p = thumbnailPath(env().DATA_DIR, created.id);
        if (fs.existsSync(p)) fs.rmSync(p);
      } catch {}
      const res = await getThumbnail(new Request('http://l'), {
        params: Promise.resolve({ id: created.id }),
      });
      expect(res.status).toBe(404);
    });

    it('POST rejects non-PNG bytes', async () => {
      const cookie = await adminCookie();
      const created = await uploadMockup(cookie, 'M');
      const notPng = Buffer.from([0xff, 0xd8, 0xff]); // jpeg magic
      const fd = new FormData();
      fd.set('thumbnail', new Blob([notPng], { type: 'image/png' }), 'not.png');
      const res = await setThumbnail(
        new Request('http://l', {
          method: 'POST',
          headers: { cookie: `mk_session=${cookie}` },
          body: fd,
        }),
        { params: Promise.resolve({ id: created.id }) },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('not_png');
    });
  });

  describe('mockups/[id]/versions/[vid]/source GET', () => {
    it('streams the source zip with attachment headers', async () => {
      const cookie = await adminCookie();
      const created = await uploadMockup(cookie, 'M');
      const res = await getVersionSource(
        new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
        { params: Promise.resolve({ id: created.id, vid: created.currentVersionId }) },
      );
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/zip');
      expect(res.headers.get('content-disposition')).toContain('attachment');
      // Drain the stream synchronously so afterEach doesn't race the file
      // deletion against an in-flight read.
      const buf = Buffer.from(await res.arrayBuffer());
      expect(buf.length).toBeGreaterThan(0);
    });

    it('404s an unknown vid', async () => {
      const cookie = await adminCookie();
      const created = await uploadMockup(cookie, 'M');
      const res = await getVersionSource(
        new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
        { params: Promise.resolve({ id: created.id, vid: 'unknown' }) },
      );
      expect(res.status).toBe(404);
    });

    it('rejects unauthenticated', async () => {
      const cookie = await adminCookie();
      const created = await uploadMockup(cookie, 'M');
      const res = await getVersionSource(new Request('http://l'), {
        params: Promise.resolve({ id: created.id, vid: created.currentVersionId }),
      });
      expect(res.status).toBe(401);
      void cookie;
    });
  });

  describe('add second version + verify versions list shape', () => {
    it('POST /version creates v2 and returns it; auto-promotes to current', async () => {
      const cookie = await adminCookie();
      const created = await uploadMockup(cookie, 'M');
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
        { params: Promise.resolve({ id: created.id }) },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.id).not.toBe(created.currentVersionId);
      const reloaded = await prisma.mockup.findUnique({ where: { id: created.id } });
      expect(reloaded?.currentVersionId).toBe(body.id);
    });
  });
});

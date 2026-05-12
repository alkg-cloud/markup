import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { POST } from '@/app/api/mockups/[id]/version-patch/route';
import { POST as createMockupRoute } from '@/app/api/mockups/route';
import { env } from '@/lib/env';
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

async function buildZip(files: Record<string, string | Buffer>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function createBaseMockup(cookie: string, indexHtml: string) {
  const zipBuf = await buildZip({ 'index.html': indexHtml });
  const fd = new FormData();
  fd.set('name', 'Patcher');
  fd.set('build', new Blob([new Uint8Array(zipBuf)], { type: 'application/zip' }), 'm.zip');
  const res = await createMockupRoute(
    new Request('http://l/api/mockups', {
      method: 'POST',
      headers: { cookie: `mk_session=${cookie}` },
      body: fd,
    }),
  );
  const body = await res.json();
  return { mockupId: body.id, versionId: body.currentVersionId };
}

function readVersionFile(mockupId: string, versionId: string, name: string): string {
  const p = path.join(env().DATA_DIR, 'mockups', mockupId, 'versions', versionId, 'build', name);
  return fs.readFileSync(p, 'utf8');
}

describe('PATCH /api/mockups/[id]/version-patch', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('applies a unified diff and creates a new version', async () => {
    const cookie = await adminCookie();
    const { mockupId, versionId } = await createBaseMockup(cookie, 'line a\nline b\nline c\n');
    const body = JSON.stringify({
      base_version_id: versionId,
      patches: {
        'index.html':
          '--- a/index.html\n+++ b/index.html\n@@ -1,3 +1,3 @@\n line a\n-line b\n+line B\n line c\n',
      },
    });
    const res = await POST(
      new Request('http://l', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}`, 'content-type': 'application/json' },
        body,
      }),
      { params: Promise.resolve({ id: mockupId }) },
    );
    expect(res.status).toBe(201);
    const { id: newVid } = await res.json();
    expect(readVersionFile(mockupId, newVid, 'index.html')).toBe('line a\nline B\nline c\n');
  });

  it('returns 409 on conflict', async () => {
    const cookie = await adminCookie();
    const { mockupId, versionId } = await createBaseMockup(cookie, 'line a\n');
    const body = JSON.stringify({
      base_version_id: versionId,
      patches: {
        'index.html': '--- a/x\n+++ b/x\n@@ -1,1 +1,1 @@\n-DIFFERENT\n+line B\n',
      },
    });
    const res = await POST(
      new Request('http://l', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}`, 'content-type': 'application/json' },
        body,
      }),
      { params: Promise.resolve({ id: mockupId }) },
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('patch_conflict');
  });

  it('returns 404 on bogus base_version_id', async () => {
    const cookie = await adminCookie();
    const { mockupId } = await createBaseMockup(cookie, 'line a\n');
    const body = JSON.stringify({
      base_version_id: 'not-a-real-id',
      patches: { 'index.html': '@@ -1,1 +1,1 @@\n-a\n+b\n' },
    });
    const res = await POST(
      new Request('http://l', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}`, 'content-type': 'application/json' },
        body,
      }),
      { params: Promise.resolve({ id: mockupId }) },
    );
    expect(res.status).toBe(404);
  });

  it('returns 415 on binary file patch', async () => {
    const cookie = await adminCookie();
    const { mockupId, versionId } = await createBaseMockup(cookie, 'a\n');
    const body = JSON.stringify({
      base_version_id: versionId,
      patches: { 'thumbnail.png': '@@ -1 +1 @@\n-a\n+b\n' },
    });
    const res = await POST(
      new Request('http://l', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}`, 'content-type': 'application/json' },
        body,
      }),
      { params: Promise.resolve({ id: mockupId }) },
    );
    expect(res.status).toBe(415);
  });

  it('returns 401 without auth', async () => {
    const res = await POST(
      new Request('http://l', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ base_version_id: 'x', patches: {} }),
      }),
      { params: Promise.resolve({ id: 'any' }) },
    );
    expect(res.status).toBe(401);
  });
});

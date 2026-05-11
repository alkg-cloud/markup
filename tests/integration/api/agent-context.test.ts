import path from 'node:path';
import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/agent/context/[annotationId]/route';
import { POST as setup } from '@/app/api/auth/setup/route';
import { createAnnotation } from '@/lib/annotation/service';
import { addVersion, createMockupFromZip } from '@/lib/mockup/service';
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

async function makePng() {
  return sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 50, g: 100, b: 50, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

async function makeAnnotation(opts?: { projectId?: string; folderId?: string }) {
  const m = await createMockupFromZip({
    name: 'CtxTest',
    zipPath: fixture('valid-simple.zip'),
    createdBy: 'u',
    createdByType: 'user',
    projectId: opts?.projectId,
    folderId: opts?.folderId,
  });
  const png = await makePng();
  const r = await createAnnotation({
    mockupId: m.mockup.id,
    screenshotPng: png,
    tldrawJson: { document: { store: {} } },
    message: 'do something',
    authorId: 'u',
    authorType: 'user',
    intentType: 'visual',
  });
  return { annotationId: r.annotation.id, mockupId: m.mockup.id, versionId: m.version.id };
}

describe('GET /api/agent/context/[annotationId]', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
    await prisma.folder.deleteMany();
    await prisma.project.deleteMany({ where: { slug: { not: 'unsorted' } } });
  });

  it('returns aggregated annotation + intent + thread + current_version inline', async () => {
    const cookie = await adminCookie();
    const { annotationId } = await makeAnnotation();
    const res = await GET(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ annotationId }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.annotation.id).toBe(annotationId);
    expect(body.annotation.intent_type).toBe('visual');
    expect(body.thread.id).toBeDefined();
    expect(body.thread.messages).toHaveLength(1);
    expect(body.thread.messages[0].body).toBe('do something');
    expect(typeof body.current_version.files['index.html']).toBe('string');
    expect(body.current_version.files['index.html']).toMatch(/<html|<!doctype/i);
    expect(body.diff_since_creation).toBe(''); // same version
  });

  it('emits diff_since_creation when current version is newer than annotation creation version', async () => {
    const cookie = await adminCookie();
    const { annotationId, mockupId } = await makeAnnotation();
    // Upload a v2 with different content. valid-simple.zip has 'index.html'
    // saying '<html></html>' (28 bytes). We'll upload a fresh zip with a
    // different index.html. For simplicity reuse the fixture upload then
    // patch the FS — but easier: just upload an in-memory ZIP via addVersion.
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file('index.html', '<html><body>v2 content</body></html>');
    const newZip = await zip.generateAsync({ type: 'nodebuffer' });
    const tmp = path.join(process.env.DATA_DIR ?? '/tmp', `tmpzip-${Date.now()}.zip`);
    (await import('node:fs')).writeFileSync(tmp, newZip);
    await addVersion({
      mockupId,
      zipPath: tmp,
      createdBy: 'u',
      createdByType: 'user',
    });

    const res = await GET(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ annotationId }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.diff_since_creation).toMatch(/v2 content/);
  });

  it('returns 304 when If-None-Match matches', async () => {
    const cookie = await adminCookie();
    const { annotationId } = await makeAnnotation();
    const res1 = await GET(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ annotationId }) },
    );
    const etag = res1.headers.get('etag');
    expect(etag).toBeTruthy();
    const res2 = await GET(
      new Request('http://l', {
        headers: { cookie: `mk_session=${cookie}`, 'if-none-match': etag! },
      }),
      { params: Promise.resolve({ annotationId }) },
    );
    expect(res2.status).toBe(304);
  });

  it('returns 401 without auth', async () => {
    const res = await GET(new Request('http://l'), {
      params: Promise.resolve({ annotationId: 'any' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 for missing annotation', async () => {
    const cookie = await adminCookie();
    const res = await GET(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ annotationId: 'no-such-id' }) },
    );
    expect(res.status).toBe(404);
  });

  it('returns project and folder_path for mockup in nested folder', async () => {
    const cookie = await adminCookie();
    const project = await prisma.project.create({
      data: { name: 'SaaS App', slug: 'saas-app' },
    });
    const rootFolder = await prisma.folder.create({
      data: { name: 'Landing Page', projectId: project.id },
    });
    const childFolder = await prisma.folder.create({
      data: { name: 'Hero Section', projectId: project.id, parentId: rootFolder.id },
    });
    const { annotationId } = await makeAnnotation({
      projectId: project.id,
      folderId: childFolder.id,
    });
    const res = await GET(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ annotationId }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project).toEqual({ id: project.id, name: 'SaaS App', slug: 'saas-app' });
    expect(body.folder_path).toBe('Landing Page/Hero Section');
  });

  it('returns project null and folder_path empty for mockup without project', async () => {
    const cookie = await adminCookie();
    const { annotationId } = await makeAnnotation();
    const res = await GET(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ annotationId }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project).toBeNull();
    expect(body.folder_path).toBe('');
  });
});

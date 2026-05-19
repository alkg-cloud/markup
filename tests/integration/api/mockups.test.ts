import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { POST as createMockup, GET as listMockups } from '@/app/api/mockups/route';
import { GET as getMockupResource } from '@/app/m/[mockupId]/[[...path]]/route';
import { prisma } from '@/lib/prisma';

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => {
      if (name === 'mk_session') {
        return { name: 'mk_session', value: 'test-cookie' };
      }
    },
  }),
}));

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

async function multipart(
  zip: string,
  name: string,
  opts?: { projectId?: string; folderId?: string; slug?: string },
) {
  const fd = new FormData();
  fd.set('name', name);
  if (opts?.slug) {
    fd.set('slug', opts.slug);
  }
  fd.set('build', new Blob([fs.readFileSync(zip)], { type: 'application/zip' }), 'mockup.zip');
  if (opts?.projectId) fd.set('projectId', opts.projectId);
  if (opts?.folderId) fd.set('folderId', opts.folderId);
  return fd;
}

describe('POST /api/mockups', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
    await prisma.folder.deleteMany();
    await prisma.project.deleteMany({ where: { slug: { not: 'unsorted' } } });
  });

  it('creates a mockup from a valid zip with admin cookie', async () => {
    const cookie = await adminCookie();
    const fd = await multipart(fixture('valid-simple.zip'), 'My-Mockup');
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

  it('creates a mockup with projectId and folderId', async () => {
    const cookie = await adminCookie();
    const project = await prisma.project.create({
      data: { name: 'Test Project', slug: 'test-project' },
    });
    const folder = await prisma.folder.create({
      data: { name: 'Section', projectId: project.id },
    });
    const fd = await multipart(fixture('valid-simple.zip'), 'With-Folder', {
      projectId: project.id,
      folderId: folder.id,
    });
    const res = await createMockup(
      new Request('http://l/api/mockups', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: fd,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.projectId).toBe(project.id);
    expect(body.folderId).toBe(folder.id);
  });

  it('rejects invalid projectId with 400', async () => {
    const cookie = await adminCookie();
    const fd = await multipart(fixture('valid-simple.zip'), 'Bad-Project', {
      projectId: 'nonexistent-id',
    });
    const res = await createMockup(
      new Request('http://l/api/mockups', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: fd,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('project_not_found');
  });

  it('creates a mockup without projectId/folderId (backward compat)', async () => {
    const cookie = await adminCookie();
    const fd = await multipart(fixture('valid-simple.zip'), 'No-Project');
    const res = await createMockup(
      new Request('http://l/api/mockups', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: fd,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.projectId).toBeNull();
    expect(body.folderId).toBeNull();
  });
});

describe('Slug support', () => {
  let mockupId: string;
  const slug = 'my-awesome-mockup';

  beforeEach(async () => {
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
    const cookie = await adminCookie();
    const fd = await multipart(fixture('valid-simple.zip'), 'My-Mockup', { slug });
    const res = await createMockup(
      new Request('http://l/api/mockups', {
        method: 'POST',
        headers: { cookie: `mk_session=${cookie}` },
        body: fd,
      }),
    );
    const body = await res.json();
    mockupId = body.id;
  });

  it('should be able to get a mockup resource by slug from /m/[slug]', async () => {
    const response = await getMockupResource(new Request(`http://l/m/${slug}/index.html`), {
      params: Promise.resolve({ mockupId: slug, path: ['index.html'] }),
    });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('hi');
  });

  it('should be able to get a mockup resource by id from /m/[id]', async () => {
    const response = await getMockupResource(new Request(`http://l/m/${mockupId}/index.html`), {
      params: Promise.resolve({ mockupId: mockupId, path: ['index.html'] }),
    });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('hi');
  });
});

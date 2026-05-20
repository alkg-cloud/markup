import { beforeEach, describe, expect, it } from 'vitest';

import { POST as setup } from '@/app/api/auth/setup/route';
import { GET as getHomeRoute } from '@/app/api/home/route';
import { POST as createFolderRoute } from '@/app/api/projects/[id]/folders/route';
import { POST as createProjectRoute } from '@/app/api/projects/route';
import { prisma } from '@/lib/prisma';

async function adminCookie() {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.config.deleteMany();
  const r = await setup(
    new Request('http://l', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'a@x.com',
        password: 'longpassword12345',
        name: 'Ada Lovelace',
      }),
    }),
  );
  return r.headers.get('set-cookie')!.match(/mk_session=([^;]+)/)![1];
}

function jsonReq(cookie: string, body?: unknown) {
  return {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      cookie: `mk_session=${cookie}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
}

beforeEach(async () => {
  await prisma.message.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.annotation.deleteMany();
  await prisma.mockupVersion.deleteMany();
  await prisma.mockup.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.project.deleteMany({ where: { slug: { not: 'unsorted' } } });
});

describe('GET /api/home', () => {
  it('rejects unauthenticated callers with 401', async () => {
    const r = await getHomeRoute(new Request('http://l'));
    expect(r.status).toBe(401);
  });

  it('returns the full HomeData shape for an authenticated admin', async () => {
    const cookie = await adminCookie();
    const project = await (
      await createProjectRoute(new Request('http://l', jsonReq(cookie, { name: 'Alpha' })))
    ).json();
    const folder = await (
      await createFolderRoute(new Request('http://l', jsonReq(cookie, { name: 'Inbox' })), {
        params: Promise.resolve({ id: project.id }),
      })
    ).json();
    await prisma.mockup.create({
      data: {
        name: 'Hero',
        slug: 'home-int-hero',
        projectId: project.id,
        folderId: folder.id,
        position: 0,
      },
    });
    await prisma.mockup.create({
      data: {
        name: 'Loose',
        slug: 'home-int-loose',
        projectId: null,
        folderId: null,
        position: 0,
      },
    });

    const r = await getHomeRoute(new Request('http://l', jsonReq(cookie)));
    expect(r.status).toBe(200);
    const body = await r.json();

    expect(body.identity).toEqual({
      name: 'Ada Lovelace',
      email: 'a@x.com',
      role: 'admin',
    });
    expect(body.greeting).toMatchObject({
      timeOfDay: expect.stringMatching(/^(morning|afternoon|evening)$/),
      updatedSinceYesterdayCount: expect.any(Number),
    });

    expect(Array.isArray(body.recents)).toBe(true);
    expect(Array.isArray(body.projects)).toBe(true);
    expect(Array.isArray(body.orphans)).toBe(true);

    // Both seeded mockups appear in recents; the folder-nested one carries
    // a `Project · Folder` breadcrumb, the orphan carries `Ungrouped`.
    const heroEntry = body.recents.find((m: { slug: string }) => m.slug === 'home-int-hero');
    const looseEntry = body.recents.find((m: { slug: string }) => m.slug === 'home-int-loose');
    expect(heroEntry).toBeTruthy();
    expect(heroEntry.breadcrumb).toBe('Alpha · Inbox');
    expect(heroEntry.href).toBe('/projects/alpha/Inbox/home-int-hero');
    expect(looseEntry).toBeTruthy();
    expect(looseEntry.breadcrumb).toBe('Ungrouped');

    // Orphans payload contains only the projectId === null mockup.
    expect(body.orphans).toHaveLength(1);
    expect(body.orphans[0].slug).toBe('home-int-loose');
    expect(body.orphans[0].href).toBe('/projects/unsorted/home-int-loose');

    // Projects payload includes the newly created project with flattened counts.
    const projectRow = body.projects.find((p: { id: string }) => p.id === project.id);
    expect(projectRow).toBeTruthy();
    expect(projectRow.name).toBe('Alpha');
    expect(projectRow.mockupCount).toBe(1);
    expect(projectRow.folderCount).toBe(1);
    expect(typeof projectRow.createdAt).toBe('string');
    expect(typeof projectRow.updatedAt).toBe('string');
  });

  it('excludes archived mockups from recents and orphans end-to-end', async () => {
    const cookie = await adminCookie();
    const project = await (
      await createProjectRoute(new Request('http://l', jsonReq(cookie, { name: 'Beta' })))
    ).json();
    await prisma.mockup.create({
      data: {
        name: 'Open',
        slug: 'home-int-open',
        status: 'open',
        projectId: project.id,
        folderId: null,
        position: 0,
      },
    });
    await prisma.mockup.create({
      data: {
        name: 'Archived',
        slug: 'home-int-archived',
        status: 'archived',
        projectId: project.id,
        folderId: null,
        position: 0,
      },
    });
    await prisma.mockup.create({
      data: {
        name: 'Archived Orphan',
        slug: 'home-int-archived-orphan',
        status: 'archived',
        projectId: null,
        folderId: null,
        position: 0,
      },
    });

    const r = await getHomeRoute(new Request('http://l', jsonReq(cookie)));
    expect(r.status).toBe(200);
    const body = await r.json();
    const slugs = body.recents.map((m: { slug: string }) => m.slug);
    expect(slugs).toContain('home-int-open');
    expect(slugs).not.toContain('home-int-archived');
    expect(slugs).not.toContain('home-int-archived-orphan');
    expect(body.orphans).toEqual([]);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { POST as moveFolderRoute } from '@/app/api/folders/[id]/move/route';
import {
  DELETE as deleteFolderRoute,
  GET as getFolderRoute,
  PATCH as patchFolderRoute,
} from '@/app/api/folders/[id]/route';
import { POST as moveMockupRoute } from '@/app/api/mockups/[id]/move/route';
import { POST as createFolderRoute } from '@/app/api/projects/[id]/folders/route';
import {
  DELETE as deleteProjectRoute,
  GET as getProjectRoute,
  PATCH as patchProjectRoute,
} from '@/app/api/projects/[id]/route';
import { GET as getTreeRoute } from '@/app/api/projects/[id]/tree/route';
import { POST as reorderRoute } from '@/app/api/projects/reorder/route';
import { POST as createProjectRoute, GET as listProjectsRoute } from '@/app/api/projects/route';
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
        name: 'A',
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

function patchReq(cookie: string, body: unknown) {
  return {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      cookie: `mk_session=${cookie}`,
    },
    body: JSON.stringify(body),
  };
}

function deleteReq(cookie: string) {
  return {
    method: 'DELETE',
    headers: { cookie: `mk_session=${cookie}` },
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

describe('projects API', () => {
  it('CRUD happy-path', async () => {
    const cookie = await adminCookie();

    const created = await createProjectRoute(
      new Request('http://l', jsonReq(cookie, { name: 'Alpha' })),
    );
    expect(created.status).toBe(201);
    const project = await created.json();
    expect(project.name).toBe('Alpha');
    expect(project.slug).toBe('alpha');

    const listed = await listProjectsRoute(new Request('http://l', jsonReq(cookie)));
    expect(listed.status).toBe(200);
    const { projects } = await listed.json();
    expect(projects.find((p: { id: string }) => p.id === project.id)).toBeTruthy();

    const got = await getProjectRoute(new Request('http://l', jsonReq(cookie)), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(got.status).toBe(200);
    expect((await got.json()).name).toBe('Alpha');

    const patched = await patchProjectRoute(
      new Request('http://l', patchReq(cookie, { name: 'Alpha Renamed' })),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(patched.status).toBe(200);
    expect((await patched.json()).name).toBe('Alpha Renamed');

    const deleted = await deleteProjectRoute(new Request('http://l', deleteReq(cookie)), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(deleted.status).toBe(200);
    expect((await deleted.json()).id).toBe(project.id);

    const gone = await getProjectRoute(new Request('http://l', jsonReq(cookie)), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(gone.status).toBe(404);
  });

  it('rejects unauthenticated', async () => {
    const r = await listProjectsRoute(new Request('http://l'));
    expect(r.status).toBe(401);
  });
});

describe('folders API', () => {
  it('create + get + update + delete', async () => {
    const cookie = await adminCookie();
    const project = await (
      await createProjectRoute(new Request('http://l', jsonReq(cookie, { name: 'P1' })))
    ).json();

    const created = await createFolderRoute(
      new Request('http://l', jsonReq(cookie, { name: 'Landing' })),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(created.status).toBe(201);
    const folder = await created.json();
    expect(folder.name).toBe('Landing');

    const got = await getFolderRoute(new Request('http://l', jsonReq(cookie)), {
      params: Promise.resolve({ id: folder.id }),
    });
    expect(got.status).toBe(200);

    const patched = await patchFolderRoute(
      new Request('http://l', patchReq(cookie, { name: 'Landing v2' })),
      { params: Promise.resolve({ id: folder.id }) },
    );
    expect(patched.status).toBe(200);
    expect((await patched.json()).name).toBe('Landing v2');

    const deleted = await deleteFolderRoute(new Request('http://l', deleteReq(cookie)), {
      params: Promise.resolve({ id: folder.id }),
    });
    expect(deleted.status).toBe(200);
  });

  it('rejects duplicate folder name at same level', async () => {
    const cookie = await adminCookie();
    const project = await (
      await createProjectRoute(new Request('http://l', jsonReq(cookie, { name: 'P1' })))
    ).json();

    await createFolderRoute(new Request('http://l', jsonReq(cookie, { name: 'Landing' })), {
      params: Promise.resolve({ id: project.id }),
    });
    const dup = await createFolderRoute(
      new Request('http://l', jsonReq(cookie, { name: 'Landing' })),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(dup.status).toBe(409);
    expect((await dup.json()).error).toBe('name_exists');
  });

  it('enforces max depth', async () => {
    const cookie = await adminCookie();
    const project = await (
      await createProjectRoute(new Request('http://l', jsonReq(cookie, { name: 'Deep' })))
    ).json();

    let parentId: string | null = null;
    for (let i = 0; i < 4; i++) {
      const r = await createFolderRoute(
        new Request('http://l', jsonReq(cookie, { name: `Level${i + 1}`, parentId })),
        { params: Promise.resolve({ id: project.id }) },
      );
      expect(r.status).toBe(201);
      parentId = (await r.json()).id;
    }

    const tooDeep = await createFolderRoute(
      new Request('http://l', jsonReq(cookie, { name: 'Level5', parentId })),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(tooDeep.status).toBe(409);
    expect((await tooDeep.json()).error).toBe('max_depth_exceeded');
  });
});

describe('tree API', () => {
  it('returns recursive tree with folders and mockups', async () => {
    const cookie = await adminCookie();
    const project = await (
      await createProjectRoute(new Request('http://l', jsonReq(cookie, { name: 'TreeTest' })))
    ).json();

    const folder = await (
      await createFolderRoute(new Request('http://l', jsonReq(cookie, { name: 'Section' })), {
        params: Promise.resolve({ id: project.id }),
      })
    ).json();

    await createFolderRoute(
      new Request(
        'http://l',
        jsonReq(cookie, {
          name: 'SubSection',
          parentId: folder.id,
        }),
      ),
      { params: Promise.resolve({ id: project.id }) },
    );

    await prisma.mockup.create({
      data: {
        name: 'M1',
        slug: 'tree-m1',
        projectId: project.id,
        folderId: folder.id,
        position: 0,
      },
    });

    const tree = await getTreeRoute(new Request('http://l', jsonReq(cookie)), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(tree.status).toBe(200);
    const body = await tree.json();
    expect(body.name).toBe('TreeTest');
    expect(body.folders).toHaveLength(1);
    expect(body.folders[0].name).toBe('Section');
    expect(body.folders[0].children).toHaveLength(1);
    expect(body.folders[0].children[0].name).toBe('SubSection');
    expect(body.folders[0].mockups).toHaveLength(1);
    expect(body.folders[0].mockups[0].name).toBe('M1');
  });
});

describe('move API', () => {
  it('moves a mockup to a different folder', async () => {
    const cookie = await adminCookie();
    const project = await (
      await createProjectRoute(new Request('http://l', jsonReq(cookie, { name: 'MoveTest' })))
    ).json();
    const folderA = await (
      await createFolderRoute(new Request('http://l', jsonReq(cookie, { name: 'A' })), {
        params: Promise.resolve({ id: project.id }),
      })
    ).json();
    const folderB = await (
      await createFolderRoute(new Request('http://l', jsonReq(cookie, { name: 'B' })), {
        params: Promise.resolve({ id: project.id }),
      })
    ).json();

    const mockup = await prisma.mockup.create({
      data: {
        name: 'M1',
        slug: 'move-m1',
        projectId: project.id,
        folderId: folderA.id,
        position: 0,
      },
    });

    const moved = await moveMockupRoute(
      new Request(
        'http://l',
        jsonReq(cookie, {
          projectId: project.id,
          folderId: folderB.id,
          position: 0,
        }),
      ),
      { params: Promise.resolve({ id: mockup.id }) },
    );
    expect(moved.status).toBe(200);
    const body = await moved.json();
    expect(body.folderId).toBe(folderB.id);
  });

  it('moves a folder to a new parent', async () => {
    const cookie = await adminCookie();
    const project = await (
      await createProjectRoute(new Request('http://l', jsonReq(cookie, { name: 'FolderMove' })))
    ).json();
    const folderA = await (
      await createFolderRoute(new Request('http://l', jsonReq(cookie, { name: 'A' })), {
        params: Promise.resolve({ id: project.id }),
      })
    ).json();
    const folderB = await (
      await createFolderRoute(new Request('http://l', jsonReq(cookie, { name: 'B' })), {
        params: Promise.resolve({ id: project.id }),
      })
    ).json();

    const moved = await moveFolderRoute(
      new Request('http://l', jsonReq(cookie, { parentId: folderA.id, position: 0 })),
      { params: Promise.resolve({ id: folderB.id }) },
    );
    expect(moved.status).toBe(200);
    const body = await moved.json();
    expect(body.parentId).toBe(folderA.id);
  });

  it('rejects cycle in folder move', async () => {
    const cookie = await adminCookie();
    const project = await (
      await createProjectRoute(new Request('http://l', jsonReq(cookie, { name: 'Cycle' })))
    ).json();
    const parent = await (
      await createFolderRoute(new Request('http://l', jsonReq(cookie, { name: 'Parent' })), {
        params: Promise.resolve({ id: project.id }),
      })
    ).json();
    const child = await (
      await createFolderRoute(
        new Request(
          'http://l',
          jsonReq(cookie, {
            name: 'Child',
            parentId: parent.id,
          }),
        ),
        { params: Promise.resolve({ id: project.id }) },
      )
    ).json();

    const cycled = await moveFolderRoute(
      new Request('http://l', jsonReq(cookie, { parentId: child.id, position: 0 })),
      { params: Promise.resolve({ id: parent.id }) },
    );
    expect(cycled.status).toBe(409);
    expect((await cycled.json()).error).toBe('cycle_detected');
  });
});

describe('reorder API', () => {
  it('reorders projects', async () => {
    const cookie = await adminCookie();
    const p1 = await (
      await createProjectRoute(new Request('http://l', jsonReq(cookie, { name: 'First' })))
    ).json();
    const p2 = await (
      await createProjectRoute(new Request('http://l', jsonReq(cookie, { name: 'Second' })))
    ).json();
    const p3 = await (
      await createProjectRoute(new Request('http://l', jsonReq(cookie, { name: 'Third' })))
    ).json();

    const reordered = await reorderRoute(
      new Request('http://l', jsonReq(cookie, { ids: [p3.id, p2.id, p1.id] })),
    );
    expect(reordered.status).toBe(200);

    const listed = await listProjectsRoute(new Request('http://l', jsonReq(cookie)));
    const { projects } = await listed.json();
    const ids = projects.map((p: { id: string }) => p.id);
    expect(ids.indexOf(p3.id)).toBeLessThan(ids.indexOf(p2.id));
    expect(ids.indexOf(p2.id)).toBeLessThan(ids.indexOf(p1.id));
  });
});

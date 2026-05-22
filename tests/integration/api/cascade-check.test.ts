import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DELETE as deleteFolderRoute } from '@/app/api/folders/[id]/route';
import { DELETE as deleteProjectRoute } from '@/app/api/projects/[id]/route';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

/**
 * Cascade-check + transaction contract.
 *
 * Locks the behaviour `8bf4b07` introduced: when a member deletes a
 * project / folder they own, the route MUST also block on any nested
 * mockup or sub-folder owned by someone else. Admin always bypasses
 * the check. The check + delete share a single Prisma transaction so
 * a foreign-owned mid-flight insert can't slip past.
 *
 * Race verification is structural (the route wraps in
 * `prisma.$transaction`); these cases pin the surrounding contract so
 * future refactors that drop the transaction surface as a 409 vs 200
 * shift.
 */

const TAG_DOMAIN = '@cascade.x';

async function makeUser(role: 'admin' | 'member') {
  const tag = `cascade-${role}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await hashPassword('longpassword12345');
  const user = await prisma.user.create({
    data: { email: `${tag}${TAG_DOMAIN}`, name: tag, passwordHash, role },
  });
  const { token } = await createSession(user.id);
  return { user, cookie: token };
}

function deleteReq(cookie: string) {
  return {
    method: 'DELETE',
    headers: { cookie: `mk_session=${cookie}` },
  };
}

async function createProject(name: string, createdById: string) {
  return prisma.project.create({
    data: { name, slug: name.toLowerCase().replace(/[^a-z0-9-]+/g, '-'), createdById },
  });
}

async function createFolder(name: string, projectId: string, createdById: string) {
  return prisma.folder.create({
    data: { name, projectId, createdById, position: 1 },
  });
}

async function createMockup(opts: {
  name: string;
  projectId?: string | null;
  folderId?: string | null;
  createdById: string | null;
}) {
  const slug = opts.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return prisma.mockup.create({
    data: {
      name: opts.name,
      slug,
      projectId: opts.projectId ?? null,
      folderId: opts.folderId ?? null,
      createdById: opts.createdById,
      position: 1,
    },
  });
}

describe('cascade-check (regression for the txn-wrapped DELETE contract)', () => {
  beforeEach(async () => {
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
    await prisma.folder.deleteMany();
    await prisma.project.deleteMany({ where: { slug: { not: 'unsorted' } } });
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: TAG_DOMAIN } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: TAG_DOMAIN } } });
  });

  describe('DELETE /api/projects/[id]', () => {
    it('member can delete own project with only own content', async () => {
      const alice = await makeUser('member');
      const project = await createProject('alice-clean', alice.user.id);
      await createMockup({ name: 'mine', projectId: project.id, createdById: alice.user.id });

      const res = await deleteProjectRoute(new Request('http://l', deleteReq(alice.cookie)), {
        params: Promise.resolve({ id: project.id }),
      });
      expect(res.status).toBe(200);
      const after = await prisma.project.findUnique({ where: { id: project.id } });
      expect(after).toBeNull();
    });

    it('member cannot delete own project containing a foreign-owned mockup (409)', async () => {
      const alice = await makeUser('member');
      const bob = await makeUser('member');
      const project = await createProject('alice-mixed', alice.user.id);
      // Bob slipped a mockup into Alice's project — the cascade check
      // is what protects Bob's row from being deleted as collateral.
      await createMockup({ name: 'bobs', projectId: project.id, createdById: bob.user.id });

      const res = await deleteProjectRoute(new Request('http://l', deleteReq(alice.cookie)), {
        params: Promise.resolve({ id: project.id }),
      });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('cascade_blocked_by_other_owner');
      // The project + Bob's mockup must still exist after the failed delete.
      expect(await prisma.project.findUnique({ where: { id: project.id } })).not.toBeNull();
      expect(await prisma.mockup.count({ where: { projectId: project.id } })).toBe(1);
    });

    it('member cannot delete project containing a null-owner (legacy) mockup', async () => {
      const alice = await makeUser('member');
      const project = await createProject('alice-legacy', alice.user.id);
      // Pre-authz rows have `createdById: null` — by convention only
      // admins can delete them; the cascade check treats them as
      // foreign-owned for members.
      await createMockup({ name: 'legacy', projectId: project.id, createdById: null });

      const res = await deleteProjectRoute(new Request('http://l', deleteReq(alice.cookie)), {
        params: Promise.resolve({ id: project.id }),
      });
      expect(res.status).toBe(409);
    });

    it('admin bypasses the cascade check — can delete project with foreign content', async () => {
      const admin = await makeUser('admin');
      const bob = await makeUser('member');
      const project = await createProject('admin-mixed', bob.user.id);
      await createMockup({ name: 'bobs', projectId: project.id, createdById: bob.user.id });

      const res = await deleteProjectRoute(new Request('http://l', deleteReq(admin.cookie)), {
        params: Promise.resolve({ id: project.id }),
      });
      expect(res.status).toBe(200);
      expect(await prisma.project.findUnique({ where: { id: project.id } })).toBeNull();
      expect(await prisma.mockup.findMany({ where: { projectId: project.id } })).toEqual([]);
    });
  });

  describe('DELETE /api/folders/[id]', () => {
    it('member cannot delete folder with foreign-owned nested mockup', async () => {
      const alice = await makeUser('member');
      const bob = await makeUser('member');
      const project = await createProject('alice-with-folder', alice.user.id);
      const folder = await createFolder('Marketing', project.id, alice.user.id);
      await createMockup({
        name: 'bobs-nested',
        projectId: project.id,
        folderId: folder.id,
        createdById: bob.user.id,
      });

      const res = await deleteFolderRoute(new Request('http://l', deleteReq(alice.cookie)), {
        params: Promise.resolve({ id: folder.id }),
      });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('cascade_blocked_by_other_owner');
    });

    it('member cannot delete folder with a foreign-owned sub-folder', async () => {
      const alice = await makeUser('member');
      const bob = await makeUser('member');
      const project = await createProject('alice-subfolders', alice.user.id);
      const parent = await createFolder('Parent', project.id, alice.user.id);
      // Bob's sub-folder is the trip wire — should block Alice's cascade.
      await prisma.folder.create({
        data: {
          name: 'Bobs',
          projectId: project.id,
          parentId: parent.id,
          createdById: bob.user.id,
          position: 1,
        },
      });

      const res = await deleteFolderRoute(new Request('http://l', deleteReq(alice.cookie)), {
        params: Promise.resolve({ id: parent.id }),
      });
      expect(res.status).toBe(409);
    });

    it('admin can delete folder with foreign nested content', async () => {
      const admin = await makeUser('admin');
      const bob = await makeUser('member');
      const project = await createProject('admin-with-folder', bob.user.id);
      const folder = await createFolder('Mixed', project.id, bob.user.id);
      await createMockup({
        name: 'bobs-nested',
        projectId: project.id,
        folderId: folder.id,
        createdById: bob.user.id,
      });

      const res = await deleteFolderRoute(new Request('http://l', deleteReq(admin.cookie)), {
        params: Promise.resolve({ id: folder.id }),
      });
      expect(res.status).toBe(200);
      expect(await prisma.folder.findUnique({ where: { id: folder.id } })).toBeNull();
    });
  });
});

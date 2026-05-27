import { NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import type { DeletableEntity } from '@/lib/auth/can-delete';
import type { Identity } from '@/lib/auth/identify';
import { requireOwnerOrAdmin, requireOwnerOrAdminFor } from '@/lib/auth/require-owner-or-admin';

// Mock prisma — controls user.role lookups and dynamic model findUnique calls.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'u-admin') return { role: 'admin' };
        if (where.id === 'u-member') return { role: 'member' };
        return null;
      }),
    },
    project: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'proj-user') {
          return { id: 'proj-user', createdBy: 'u-member', createdByType: 'user' };
        }
        if (where.id === 'proj-agent') {
          return { id: 'proj-agent', createdBy: 'tok-1', createdByType: 'agent' };
        }
        return null;
      }),
    },
    folder: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'folder-user') {
          return { id: 'folder-user', createdBy: 'u-member', createdByType: 'user' };
        }
        return null;
      }),
    },
    mockup: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'mockup-agent') {
          return { id: 'mockup-agent', createdBy: 'tok-1', createdByType: 'agent' };
        }
        return null;
      }),
    },
    annotation: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'ann-user') {
          return { id: 'ann-user', createdBy: 'u-member', createdByType: 'user' };
        }
        return null;
      }),
    },
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const userMemberIdent: Identity = { kind: 'user', userId: 'u-member', sessionId: 's-1' };
const userAdminIdent: Identity = { kind: 'user', userId: 'u-admin', sessionId: 's-2' };
const agentIdent: Identity = { kind: 'agent', tokenId: 'tok-1', name: 'bot' };
const otherAgentIdent: Identity = { kind: 'agent', tokenId: 'tok-other', name: 'intruder' };

const userOwnedProject: DeletableEntity = {
  kind: 'project',
  createdBy: 'u-member',
  createdByType: 'user',
};
const agentOwnedProject: DeletableEntity = {
  kind: 'project',
  createdBy: 'tok-1',
  createdByType: 'agent',
};
const legacyProject: DeletableEntity = {
  kind: 'project',
  createdBy: null,
  createdByType: null,
};

// ── requireOwnerOrAdmin ───────────────────────────────────────────────────────

describe('requireOwnerOrAdmin', () => {
  it('throws 401 when identity is null', async () => {
    await expect(requireOwnerOrAdmin(null, userOwnedProject)).rejects.toMatchObject({
      message: 'unauthorized',
      status: 401,
    });
  });

  it('returns viewer when user is the owner', async () => {
    const viewer = await requireOwnerOrAdmin(userMemberIdent, userOwnedProject);
    expect(viewer).toEqual({ kind: 'user', userId: 'u-member', role: 'member' });
  });

  it('throws 403 when user is not the owner and not admin', async () => {
    const otherMemberIdent: Identity = { kind: 'user', userId: 'u-member', sessionId: 's-x' };
    // entity owned by a different user
    const otherUserEntity: DeletableEntity = {
      kind: 'project',
      createdBy: 'u-someone-else',
      createdByType: 'user',
    };
    await expect(requireOwnerOrAdmin(otherMemberIdent, otherUserEntity)).rejects.toMatchObject({
      message: 'forbidden_owner',
      status: 403,
    });
  });

  it('admin user bypasses ownership check even when not the creator', async () => {
    // Admin did not create this; should still be allowed
    const viewer = await requireOwnerOrAdmin(userAdminIdent, userOwnedProject);
    expect(viewer).toEqual({ kind: 'user', userId: 'u-admin', role: 'admin' });
  });

  it('admin user bypasses ownership check on agent-owned entity', async () => {
    const viewer = await requireOwnerOrAdmin(userAdminIdent, agentOwnedProject);
    expect(viewer).toEqual({ kind: 'user', userId: 'u-admin', role: 'admin' });
  });

  it('admin user can act on legacy (null createdBy) entity', async () => {
    const viewer = await requireOwnerOrAdmin(userAdminIdent, legacyProject);
    expect(viewer).toEqual({ kind: 'user', userId: 'u-admin', role: 'admin' });
  });

  it('member cannot delete legacy (null createdBy) entity', async () => {
    await expect(requireOwnerOrAdmin(userMemberIdent, legacyProject)).rejects.toMatchObject({
      message: 'forbidden_owner',
      status: 403,
    });
  });

  it('agent returns viewer when agent is the owner', async () => {
    const viewer = await requireOwnerOrAdmin(agentIdent, agentOwnedProject);
    expect(viewer).toEqual({ kind: 'agent', tokenId: 'tok-1' });
  });

  it('agent throws 403 when not the owner', async () => {
    await expect(requireOwnerOrAdmin(otherAgentIdent, agentOwnedProject)).rejects.toMatchObject({
      message: 'forbidden_owner',
      status: 403,
    });
  });

  it('agent cannot delete user-owned entity', async () => {
    await expect(requireOwnerOrAdmin(agentIdent, userOwnedProject)).rejects.toMatchObject({
      message: 'forbidden_owner',
      status: 403,
    });
  });

  it('unknown user id falls back to member role (no DB row)', async () => {
    const ghostIdent: Identity = { kind: 'user', userId: 'u-ghost', sessionId: 's-g' };
    const ghostOwned: DeletableEntity = {
      kind: 'project',
      createdBy: 'u-ghost',
      createdByType: 'user',
    };
    // Ghost user maps to role=member; since they "created" the entity it should pass
    const viewer = await requireOwnerOrAdmin(ghostIdent, ghostOwned);
    expect(viewer).toEqual({ kind: 'user', userId: 'u-ghost', role: 'member' });
  });
});

// ── requireOwnerOrAdminFor ────────────────────────────────────────────────────

describe('requireOwnerOrAdminFor', () => {
  it('returns 404 NextResponse when the resource does not exist', async () => {
    const result = await requireOwnerOrAdminFor(userMemberIdent, 'project', 'nonexistent-id');
    expect(result).toBeInstanceOf(NextResponse);
    const body = await (result as NextResponse).json();
    expect(body).toEqual({ error: 'not_found' });
    expect((result as NextResponse).status).toBe(404);
  });

  it('returns viewer + row when user owns the project', async () => {
    const result = await requireOwnerOrAdminFor(userMemberIdent, 'project', 'proj-user');
    expect(result).not.toBeInstanceOf(NextResponse);
    const { viewer, row } = result as { viewer: unknown; row: unknown };
    expect(viewer).toEqual({ kind: 'user', userId: 'u-member', role: 'member' });
    expect(row).toMatchObject({ id: 'proj-user', createdBy: 'u-member', createdByType: 'user' });
  });

  it('returns 403 NextResponse when user does not own the project', async () => {
    const otherMemberIdent: Identity = {
      kind: 'user',
      userId: 'u-other',
      sessionId: 's-other',
    };
    // u-other's role = member (falls through to null → member)
    const result = await requireOwnerOrAdminFor(otherMemberIdent, 'project', 'proj-user');
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('admin bypasses ownership — returns viewer + row', async () => {
    const result = await requireOwnerOrAdminFor(userAdminIdent, 'project', 'proj-user');
    expect(result).not.toBeInstanceOf(NextResponse);
    const { viewer } = result as { viewer: { kind: string; role?: string } };
    expect(viewer).toMatchObject({ kind: 'user', role: 'admin' });
  });

  it('agent owns the project — returns viewer + row', async () => {
    const result = await requireOwnerOrAdminFor(agentIdent, 'project', 'proj-agent');
    expect(result).not.toBeInstanceOf(NextResponse);
    const { viewer, row } = result as { viewer: unknown; row: unknown };
    expect(viewer).toEqual({ kind: 'agent', tokenId: 'tok-1' });
    expect(row).toMatchObject({ id: 'proj-agent', createdBy: 'tok-1', createdByType: 'agent' });
  });

  it('wrong agent on project — returns 403 NextResponse', async () => {
    const result = await requireOwnerOrAdminFor(otherAgentIdent, 'project', 'proj-agent');
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns 401 NextResponse when identity is null', async () => {
    const result = await requireOwnerOrAdminFor(null, 'project', 'proj-user');
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('works with kind=folder', async () => {
    const result = await requireOwnerOrAdminFor(userMemberIdent, 'folder', 'folder-user');
    expect(result).not.toBeInstanceOf(NextResponse);
    const { row } = result as { row: { id: string } };
    expect(row.id).toBe('folder-user');
  });

  it('works with kind=mockup (agent-owned)', async () => {
    const result = await requireOwnerOrAdminFor(agentIdent, 'mockup', 'mockup-agent');
    expect(result).not.toBeInstanceOf(NextResponse);
    const { viewer } = result as { viewer: { kind: string } };
    expect(viewer.kind).toBe('agent');
  });

  it('works with kind=annotation', async () => {
    const result = await requireOwnerOrAdminFor(userMemberIdent, 'annotation', 'ann-user');
    expect(result).not.toBeInstanceOf(NextResponse);
    const { row } = result as { row: { id: string } };
    expect(row.id).toBe('ann-user');
  });
});

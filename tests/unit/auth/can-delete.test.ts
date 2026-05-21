import { describe, expect, it } from 'vitest';
import { canDelete, type DeletableEntity, type Viewer } from '@/lib/auth/can-delete';

const admin: Viewer = { kind: 'user', userId: 'u-admin', role: 'admin' };
const member: Viewer = { kind: 'user', userId: 'u-alice', role: 'member' };
const otherMember: Viewer = { kind: 'user', userId: 'u-bob', role: 'member' };
const agent: Viewer = { kind: 'agent', tokenId: 'tok-1' };

// ── Project ──────────────────────────────────────────────────────────────────

describe('project', () => {
  const owned: DeletableEntity = { kind: 'project', createdById: member.userId };
  const foreignOwned: DeletableEntity = { kind: 'project', createdById: otherMember.userId };
  const legacy: DeletableEntity = { kind: 'project', createdById: null };

  it('admin can delete', () => expect(canDelete(admin, owned)).toBe(true));
  it('member can delete own', () => expect(canDelete(member, owned)).toBe(true));
  it('member cannot delete other member project', () =>
    expect(canDelete(member, foreignOwned)).toBe(false));
  it('member cannot delete legacy (null createdById)', () =>
    expect(canDelete(member, legacy)).toBe(false));
  it('admin can delete legacy', () => expect(canDelete(admin, legacy)).toBe(true));
  it('agent cannot delete project', () => expect(canDelete(agent, owned)).toBe(false));
});

// ── Folder ────────────────────────────────────────────────────────────────────

describe('folder', () => {
  const owned: DeletableEntity = { kind: 'folder', createdById: member.userId };
  const legacy: DeletableEntity = { kind: 'folder', createdById: null };

  it('admin can delete', () => expect(canDelete(admin, owned)).toBe(true));
  it('member can delete own', () => expect(canDelete(member, owned)).toBe(true));
  it('member cannot delete others folder', () =>
    expect(canDelete(member, { kind: 'folder', createdById: otherMember.userId })).toBe(false));
  it('member cannot delete legacy', () => expect(canDelete(member, legacy)).toBe(false));
  it('agent cannot delete folder', () => expect(canDelete(agent, owned)).toBe(false));
});

// ── Mockup ────────────────────────────────────────────────────────────────────

describe('mockup', () => {
  const owned: DeletableEntity = { kind: 'mockup', createdById: member.userId };
  const agentOwned: DeletableEntity = { kind: 'mockup', createdById: null }; // agent → null

  it('admin can delete', () => expect(canDelete(admin, owned)).toBe(true));
  it('member can delete own', () => expect(canDelete(member, owned)).toBe(true));
  it('member cannot delete null-owner mockup', () =>
    expect(canDelete(member, agentOwned)).toBe(false));
  it('agent cannot delete mockup', () => expect(canDelete(agent, owned)).toBe(false));
});

// ── MockupVersion ─────────────────────────────────────────────────────────────

describe('mockupVersion', () => {
  const userVer: DeletableEntity = {
    kind: 'mockupVersion',
    createdBy: member.userId,
    createdByType: 'user',
  };
  const agentVer: DeletableEntity = {
    kind: 'mockupVersion',
    createdBy: 'tok-1',
    createdByType: 'agent',
  };

  it('admin can delete user version', () => expect(canDelete(admin, userVer)).toBe(true));
  it('admin can delete agent version', () => expect(canDelete(admin, agentVer)).toBe(true));
  it('member can delete own user version', () => expect(canDelete(member, userVer)).toBe(true));
  it('member cannot delete another member version', () =>
    expect(
      canDelete(member, {
        kind: 'mockupVersion',
        createdBy: otherMember.userId,
        createdByType: 'user',
      }),
    ).toBe(false));
  it('member cannot delete agent version', () => expect(canDelete(member, agentVer)).toBe(false));
  it('agent cannot delete mockupVersion', () => expect(canDelete(agent, userVer)).toBe(false));
});

// ── Annotation ────────────────────────────────────────────────────────────────

describe('annotation', () => {
  const userAnnot: DeletableEntity = {
    kind: 'annotation',
    createdBy: member.userId,
    createdByType: 'user',
  };
  const agentAnnot: DeletableEntity = {
    kind: 'annotation',
    createdBy: 'tok-1',
    createdByType: 'agent',
  };

  it('admin can delete', () => expect(canDelete(admin, userAnnot)).toBe(true));
  it('member can delete own', () => expect(canDelete(member, userAnnot)).toBe(true));
  it('member cannot delete others annotation', () =>
    expect(
      canDelete(member, {
        kind: 'annotation',
        createdBy: otherMember.userId,
        createdByType: 'user',
      }),
    ).toBe(false));
  it('member cannot delete agent annotation', () =>
    expect(canDelete(member, agentAnnot)).toBe(false));
  it('agent cannot delete annotation', () => expect(canDelete(agent, userAnnot)).toBe(false));
});

// ── Message ───────────────────────────────────────────────────────────────────

describe('message', () => {
  const userMsg: DeletableEntity = {
    kind: 'message',
    authorId: member.userId,
    authorType: 'user',
  };
  const agentMsg: DeletableEntity = {
    kind: 'message',
    authorId: 'tok-1',
    authorType: 'agent',
  };

  it('admin can delete any message', () => expect(canDelete(admin, userMsg)).toBe(true));
  it('admin can delete agent message', () => expect(canDelete(admin, agentMsg)).toBe(true));
  it('member can delete own message', () => expect(canDelete(member, userMsg)).toBe(true));
  it('member cannot delete other user message', () =>
    expect(
      canDelete(member, { kind: 'message', authorId: otherMember.userId, authorType: 'user' }),
    ).toBe(false));
  it('agent can delete own message', () => expect(canDelete(agent, agentMsg)).toBe(true));
  it('agent cannot delete another agents message', () =>
    expect(canDelete(agent, { kind: 'message', authorId: 'tok-other', authorType: 'agent' })).toBe(
      false,
    ));
  it('agent cannot delete user message', () => expect(canDelete(agent, userMsg)).toBe(false));
});

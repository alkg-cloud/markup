import { describe, expect, it } from 'vitest';
import { canDelete, type DeletableEntity, type Viewer } from '@/lib/auth/can-delete';

const admin: Viewer = { kind: 'user', userId: 'u-admin', role: 'admin' };
const member: Viewer = { kind: 'user', userId: 'u-alice', role: 'member' };
const otherMember: Viewer = { kind: 'user', userId: 'u-bob', role: 'member' };
const agent: Viewer = { kind: 'agent', tokenId: 'tok-1' };
const otherAgent: Viewer = { kind: 'agent', tokenId: 'tok-2' };

// ── Project ──────────────────────────────────────────────────────────────────
describe('canDelete — project', () => {
  const memberOwned: DeletableEntity = {
    kind: 'project',
    createdBy: member.userId,
    createdByType: 'user',
  };
  const agentOwned: DeletableEntity = {
    kind: 'project',
    createdBy: agent.tokenId,
    createdByType: 'agent',
  };
  const legacy: DeletableEntity = { kind: 'project', createdBy: null, createdByType: null };

  it('admin can delete user-owned', () => expect(canDelete(admin, memberOwned)).toBe(true));
  it('admin can delete agent-owned', () => expect(canDelete(admin, agentOwned)).toBe(true));
  it('admin can delete legacy', () => expect(canDelete(admin, legacy)).toBe(true));
  it('member can delete own', () => expect(canDelete(member, memberOwned)).toBe(true));
  it('member cannot delete other member', () =>
    expect(canDelete(otherMember, memberOwned)).toBe(false));
  it('member cannot delete agent-owned', () => expect(canDelete(member, agentOwned)).toBe(false));
  it('member cannot delete legacy', () => expect(canDelete(member, legacy)).toBe(false));
  it('agent can delete own', () => expect(canDelete(agent, agentOwned)).toBe(true));
  it('agent cannot delete other agent', () =>
    expect(canDelete(otherAgent, agentOwned)).toBe(false));
  it('agent cannot delete user-owned', () => expect(canDelete(agent, memberOwned)).toBe(false));
  it('agent cannot delete legacy', () => expect(canDelete(agent, legacy)).toBe(false));
});

// ── Folder ───────────────────────────────────────────────────────────────────
describe('canDelete — folder', () => {
  const memberOwned: DeletableEntity = {
    kind: 'folder',
    createdBy: member.userId,
    createdByType: 'user',
  };
  const agentOwned: DeletableEntity = {
    kind: 'folder',
    createdBy: agent.tokenId,
    createdByType: 'agent',
  };

  it('admin can delete user-owned', () => expect(canDelete(admin, memberOwned)).toBe(true));
  it('member can delete own', () => expect(canDelete(member, memberOwned)).toBe(true));
  it('agent can delete own', () => expect(canDelete(agent, agentOwned)).toBe(true));
  it('member cannot delete agent-owned', () => expect(canDelete(member, agentOwned)).toBe(false));
  it('agent cannot delete user-owned', () => expect(canDelete(agent, memberOwned)).toBe(false));
});

// ── Mockup ───────────────────────────────────────────────────────────────────
describe('canDelete — mockup', () => {
  const memberOwned: DeletableEntity = {
    kind: 'mockup',
    createdBy: member.userId,
    createdByType: 'user',
  };
  const agentOwned: DeletableEntity = {
    kind: 'mockup',
    createdBy: agent.tokenId,
    createdByType: 'agent',
  };
  const legacy: DeletableEntity = { kind: 'mockup', createdBy: null, createdByType: null };

  it('admin can delete user-owned', () => expect(canDelete(admin, memberOwned)).toBe(true));
  it('admin can delete agent-owned', () => expect(canDelete(admin, agentOwned)).toBe(true));
  it('admin can delete legacy', () => expect(canDelete(admin, legacy)).toBe(true));
  it('member can delete own', () => expect(canDelete(member, memberOwned)).toBe(true));
  it('agent can delete own', () => expect(canDelete(agent, agentOwned)).toBe(true));
  it('member cannot delete agent-owned', () => expect(canDelete(member, agentOwned)).toBe(false));
  it('agent cannot delete user-owned', () => expect(canDelete(agent, memberOwned)).toBe(false));
  it('agent cannot delete legacy', () => expect(canDelete(agent, legacy)).toBe(false));
});

// ── MockupVersion ────────────────────────────────────────────────────────────
describe('canDelete — mockupVersion', () => {
  const userOwned: DeletableEntity = {
    kind: 'mockupVersion',
    createdBy: member.userId,
    createdByType: 'user',
  };
  const agentOwned: DeletableEntity = {
    kind: 'mockupVersion',
    createdBy: agent.tokenId,
    createdByType: 'agent',
  };

  it('admin can delete', () => expect(canDelete(admin, userOwned)).toBe(true));
  it('admin can delete agent-version', () => expect(canDelete(admin, agentOwned)).toBe(true));
  it('member can delete own', () => expect(canDelete(member, userOwned)).toBe(true));
  it('agent can delete own (new behavior)', () => expect(canDelete(agent, agentOwned)).toBe(true));
  it('member cannot delete agent-version', () => expect(canDelete(member, agentOwned)).toBe(false));
  it('agent cannot delete user-version', () => expect(canDelete(agent, userOwned)).toBe(false));
});

// ── Annotation ───────────────────────────────────────────────────────────────
describe('canDelete — annotation', () => {
  const userOwned: DeletableEntity = {
    kind: 'annotation',
    createdBy: member.userId,
    createdByType: 'user',
  };
  const agentOwned: DeletableEntity = {
    kind: 'annotation',
    createdBy: agent.tokenId,
    createdByType: 'agent',
  };

  it('admin can delete', () => expect(canDelete(admin, userOwned)).toBe(true));
  it('member can delete own', () => expect(canDelete(member, userOwned)).toBe(true));
  it('agent can delete own (new behavior)', () => expect(canDelete(agent, agentOwned)).toBe(true));
  it('member cannot delete agent-annotation', () =>
    expect(canDelete(member, agentOwned)).toBe(false));
  it('agent cannot delete user-annotation', () => expect(canDelete(agent, userOwned)).toBe(false));
});

// ── Message ──────────────────────────────────────────────────────────────────
describe('canDelete — message', () => {
  const userMsg: DeletableEntity = { kind: 'message', authorId: member.userId, authorType: 'user' };
  const agentMsg: DeletableEntity = {
    kind: 'message',
    authorId: agent.tokenId,
    authorType: 'agent',
  };

  it('admin can delete', () => expect(canDelete(admin, userMsg)).toBe(true));
  it('member can delete own', () => expect(canDelete(member, userMsg)).toBe(true));
  it('agent can delete own', () => expect(canDelete(agent, agentMsg)).toBe(true));
  it('member cannot delete agent-message', () => expect(canDelete(member, agentMsg)).toBe(false));
  it('agent cannot delete user-message', () => expect(canDelete(agent, userMsg)).toBe(false));
});

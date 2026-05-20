import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  effectiveStatus,
  findInviteByPresentedToken,
  generateInvite,
  hashInviteSecret,
  TOKEN_RE,
} from '@/lib/auth/invite-token';
import { prisma } from '@/lib/prisma';

async function adminUserId() {
  await prisma.invite.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  const u = await prisma.user.create({
    data: { email: 'a@x.com', name: 'A', passwordHash: 'x', role: 'admin' },
  });
  return u.id;
}

describe('TOKEN_RE', () => {
  it('accepts mki_live_<hex64>', () => {
    expect(TOKEN_RE.test(`mki_live_${'a'.repeat(64)}`)).toBe(true);
  });
  it('accepts mki_test_<hex64>', () => {
    expect(TOKEN_RE.test(`mki_test_${'f'.repeat(64)}`)).toBe(true);
  });
  it('rejects mk_<hex64> (agent prefix)', () => {
    expect(TOKEN_RE.test(`mk_live_${'a'.repeat(64)}`)).toBe(false);
  });
  it('rejects wrong length', () => {
    expect(TOKEN_RE.test(`mki_live_${'a'.repeat(63)}`)).toBe(false);
  });
  it('rejects non-hex', () => {
    expect(TOKEN_RE.test(`mki_live_${'g'.repeat(64)}`)).toBe(false);
  });
});

describe('hashInviteSecret', () => {
  it('is deterministic', () => {
    expect(hashInviteSecret('foo')).toBe(hashInviteSecret('foo'));
  });
  it('changes with input', () => {
    expect(hashInviteSecret('foo')).not.toBe(hashInviteSecret('bar'));
  });
});

describe('generateInvite + findInviteByPresentedToken', () => {
  beforeEach(async () => {
    await prisma.invite.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('persists tokenHash, not plaintext', async () => {
    const adminId = await adminUserId();
    const created = await generateInvite({
      email: null,
      role: 'member',
      expiresAt: null,
      createdById: adminId,
    });
    expect(created.plaintext).toMatch(TOKEN_RE);
    const row = await prisma.invite.findUnique({ where: { id: created.id } });
    expect(row).toBeDefined();
    // The row's tokenHash equals SHA-256(plaintext) — no plaintext stored.
    expect(row?.tokenHash).toBe(hashInviteSecret(created.plaintext));
    // Sanity: the plaintext does NOT appear in any text column.
    expect(JSON.stringify(row)).not.toContain(created.plaintext);
  });

  it('findInviteByPresentedToken returns null for malformed input', async () => {
    expect(await findInviteByPresentedToken('not-a-token')).toBeNull();
    expect(await findInviteByPresentedToken('')).toBeNull();
  });

  it('findInviteByPresentedToken returns null for unknown valid-format token', async () => {
    const candidate = `mki_test_${'a'.repeat(64)}`;
    expect(await findInviteByPresentedToken(candidate)).toBeNull();
  });

  it('finds the matching invite by plaintext', async () => {
    const adminId = await adminUserId();
    const created = await generateInvite({
      email: null,
      role: 'member',
      expiresAt: null,
      createdById: adminId,
    });
    const found = await findInviteByPresentedToken(created.plaintext);
    expect(found?.id).toBe(created.id);
  });
});

describe('effectiveStatus', () => {
  it('returns expired for unused + past expiresAt', () => {
    const now = new Date('2026-05-20T12:00:00Z');
    const past = new Date('2026-05-19T12:00:00Z');
    expect(effectiveStatus({ status: 'unused', expiresAt: past }, now)).toBe('expired');
  });
  it('returns unused for null expiresAt', () => {
    expect(effectiveStatus({ status: 'unused', expiresAt: null }, new Date())).toBe('unused');
  });
  it('returns unused for future expiresAt', () => {
    const now = new Date('2026-05-20T12:00:00Z');
    const future = new Date('2026-05-21T12:00:00Z');
    expect(effectiveStatus({ status: 'unused', expiresAt: future }, now)).toBe('unused');
  });
  it('returns the stored status unchanged for non-unused', () => {
    expect(effectiveStatus({ status: 'used', expiresAt: null })).toBe('used');
    expect(effectiveStatus({ status: 'revoked', expiresAt: null })).toBe('revoked');
    expect(effectiveStatus({ status: 'disabled', expiresAt: null })).toBe('disabled');
  });
});

afterEach(async () => {
  await prisma.invite.deleteMany();
  await prisma.user.deleteMany();
});

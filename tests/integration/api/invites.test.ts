import { beforeEach, describe, expect, it } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { POST as redeem } from '@/app/api/invites/[id]/redeem/route';
import { DELETE as deleteInvite } from '@/app/api/invites/[id]/route';
import { GET as inviteState } from '@/app/api/invites/[id]/state/route';
import { DELETE as clearHistory } from '@/app/api/invites/history/route';
import { POST as revokeAll } from '@/app/api/invites/revoke-all/route';
import { POST as createInvite, GET as listInvites } from '@/app/api/invites/route';
import { hashInviteSecret } from '@/lib/auth/invite-token';
import { hashPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/prisma';
import { inviteRedeemIpLimiter } from '@/lib/rate-limit';

async function freshState() {
  await prisma.invite.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.config.deleteMany();
  inviteRedeemIpLimiter.reset('invite-redeem:unknown');
  inviteRedeemIpLimiter.reset('invite-redeem:1.2.3.4');
  inviteRedeemIpLimiter.reset('invite-redeem:5.5.5.5');
  inviteRedeemIpLimiter.reset('invite-redeem:6.6.6.6');
  inviteRedeemIpLimiter.reset('invite-redeem:7.7.7.7');
}

async function adminCookie() {
  const r = await setup(
    new Request('http://l', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@x.com', password: 'longpassword12345', name: 'Admin' }),
    }),
  );
  return r.headers.get('set-cookie')!.match(/mk_session=([^;]+)/)![1];
}

async function makeMember() {
  return prisma.user.create({
    data: {
      email: 'member@x.com',
      name: 'Member',
      passwordHash: await hashPassword('longpassword12345'),
      role: 'member',
    },
  });
}

async function memberCookie() {
  const member = await makeMember();
  const session = await prisma.session.create({
    data: { userId: member.id, expiresAt: new Date(Date.now() + 60_000) },
  });
  const { signSession } = await import('@/lib/auth/jwt');
  return signSession({ sessionId: session.id, userId: member.id }, 60);
}

function makeAdminGet(cookie: string) {
  return new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } });
}

function makeAdminPost(cookie: string, body: unknown) {
  return new Request('http://l', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `mk_session=${cookie}` },
    body: JSON.stringify(body),
  });
}

function makeAdminDelete(cookie: string) {
  return new Request('http://l', {
    method: 'DELETE',
    headers: { cookie: `mk_session=${cookie}` },
  });
}

async function mintInvite(
  cookie: string,
  body: {
    email?: string | null;
    role?: 'admin' | 'member';
    expiry?: '24h' | '7d' | '30d' | 'never';
  } = {},
) {
  const res = await createInvite(
    makeAdminPost(cookie, {
      email: body.email ?? null,
      role: body.role ?? 'member',
      expiry: body.expiry ?? '7d',
    }),
  );
  expect(res.status).toBe(201);
  return res.json();
}

beforeEach(freshState);

describe('invites API', () => {
  describe('POST /api/invites', () => {
    it('creates an invite with the requested role + expiry (case 11)', async () => {
      const cookie = await adminCookie();
      const res = await createInvite(
        makeAdminPost(cookie, { email: 'bea@studio.io', role: 'member', expiry: '7d' }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.plaintext).toMatch(/^mki_(?:live_|test_)?[0-9a-f]{64}$/);
      expect(body.role).toBe('member');
      expect(body.email).toBe('bea@studio.io');
      const row = await prisma.invite.findUnique({ where: { id: body.id } });
      expect(row?.tokenHash).toBe(hashInviteSecret(body.plaintext));
    });

    it('returns 400 on invalid email format (case 12)', async () => {
      const cookie = await adminCookie();
      const res = await createInvite(
        makeAdminPost(cookie, { email: 'not-an-email', role: 'member', expiry: '7d' }),
      );
      expect(res.status).toBe(400);
    });

    it('returns 403 forbidden_role for member callers (case 13)', async () => {
      const cookie = await memberCookie();
      const res = await createInvite(
        makeAdminPost(cookie, { email: null, role: 'member', expiry: '7d' }),
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('forbidden_role');
    });

    it('Origin check rejects POST from disallowed origin (case 14)', async () => {
      const cookie = await adminCookie();
      const res = await createInvite(
        new Request('http://l', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: `mk_session=${cookie}`,
            origin: 'https://evil.example',
          },
          body: JSON.stringify({ email: null, role: 'member', expiry: '7d' }),
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/invites', () => {
    it('returns invites newest-first (case 15)', async () => {
      const cookie = await adminCookie();
      await createInvite(makeAdminPost(cookie, { email: null, role: 'member', expiry: '7d' }));
      await new Promise((r) => setTimeout(r, 5));
      await createInvite(makeAdminPost(cookie, { email: null, role: 'admin', expiry: '24h' }));
      const res = await listInvites(makeAdminGet(cookie));
      const body = await res.json();
      expect(body.invites).toHaveLength(2);
      expect(new Date(body.invites[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(body.invites[1].createdAt).getTime(),
      );
    });

    it('surfaces "expired" for unused + past expiresAt (case 16)', async () => {
      const cookie = await adminCookie();
      const adminUser = await prisma.user.findUnique({ where: { email: 'admin@x.com' } });
      await prisma.invite.create({
        data: {
          tokenHash: 'fake-hash-1',
          prefix: 'mki_test_',
          lastFour: 'xxxx',
          email: null,
          role: 'member',
          expiresAt: new Date(Date.now() - 86_400_000),
          createdById: adminUser!.id,
          status: 'unused',
        },
      });
      const res = await listInvites(makeAdminGet(cookie));
      const body = await res.json();
      expect(body.invites[0].status).toBe('expired');
    });

    it('response never contains an mki_… substring (case 17)', async () => {
      const cookie = await adminCookie();
      await createInvite(makeAdminPost(cookie, { email: null, role: 'member', expiry: '7d' }));
      const res = await listInvites(makeAdminGet(cookie));
      const text = await res.text();
      expect(text).not.toMatch(/mki_(live|test)_[0-9a-f]{64}/);
    });
  });

  describe('DELETE /api/invites/[id]', () => {
    it("transitions unused → revoked, returns { action: 'revoked' } (case 18)", async () => {
      const cookie = await adminCookie();
      const created = await mintInvite(cookie, { email: null, role: 'member', expiry: '7d' });
      const res = await deleteInvite(makeAdminDelete(cookie), {
        params: Promise.resolve({ id: created.id }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.action).toBe('revoked');
      const row = await prisma.invite.findUnique({ where: { id: created.id } });
      expect(row).not.toBeNull();
      expect(row?.status).toBe('revoked');
      expect(row?.revokedAt).not.toBeNull();
    });

    it("hard-deletes a used row, returns { action: 'deleted' } (case 19)", async () => {
      const cookie = await adminCookie();
      const adminUser = await prisma.user.findUnique({ where: { email: 'admin@x.com' } });
      const seeded = await prisma.invite.create({
        data: {
          tokenHash: 'fake-hash-used',
          prefix: 'mki_test_',
          lastFour: 'xxxx',
          email: null,
          role: 'member',
          createdById: adminUser!.id,
          status: 'used',
          usedAt: new Date(),
        },
      });
      const res = await deleteInvite(makeAdminDelete(cookie), {
        params: Promise.resolve({ id: seeded.id }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.action).toBe('deleted');
      expect(await prisma.invite.findUnique({ where: { id: seeded.id } })).toBeNull();
    });
  });

  describe('bulk endpoints', () => {
    it("revoke-all flips every unused-not-expired invite to 'revoked', returns the count (case 20)", async () => {
      const cookie = await adminCookie();
      const adminUser = await prisma.user.findUnique({ where: { email: 'admin@x.com' } });
      // Seed: 3 unused-not-expired, 1 unused-but-expired, 1 used.
      await prisma.invite.createMany({
        data: [
          {
            tokenHash: 'h1',
            prefix: 'mki_test_',
            lastFour: 'a',
            role: 'member',
            createdById: adminUser!.id,
            status: 'unused',
            expiresAt: new Date(Date.now() + 86_400_000),
          },
          {
            tokenHash: 'h2',
            prefix: 'mki_test_',
            lastFour: 'b',
            role: 'member',
            createdById: adminUser!.id,
            status: 'unused',
            expiresAt: null,
          },
          {
            tokenHash: 'h3',
            prefix: 'mki_test_',
            lastFour: 'c',
            role: 'admin',
            createdById: adminUser!.id,
            status: 'unused',
            expiresAt: new Date(Date.now() + 86_400_000),
          },
          {
            tokenHash: 'h4',
            prefix: 'mki_test_',
            lastFour: 'd',
            role: 'member',
            createdById: adminUser!.id,
            status: 'unused',
            expiresAt: new Date(Date.now() - 86_400_000), // expired
          },
          {
            tokenHash: 'h5',
            prefix: 'mki_test_',
            lastFour: 'e',
            role: 'member',
            createdById: adminUser!.id,
            status: 'used',
            usedAt: new Date(),
          },
        ],
      });
      const res = await revokeAll(makeAdminPost(cookie, {}));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.revoked).toBe(3);
      const revoked = await prisma.invite.findMany({ where: { status: 'revoked' } });
      expect(revoked).toHaveLength(3);
      // The expired (still 'unused' in DB) and used rows are untouched.
      const unused = await prisma.invite.findMany({ where: { status: 'unused' } });
      expect(unused).toHaveLength(1);
      expect(unused[0].tokenHash).toBe('h4');
    });

    it('clear-history deletes every terminal row including computed-expired (case 21)', async () => {
      const cookie = await adminCookie();
      const adminUser = await prisma.user.findUnique({ where: { email: 'admin@x.com' } });
      await prisma.invite.createMany({
        data: [
          {
            tokenHash: 'h-used',
            prefix: 'mki_test_',
            lastFour: 'a',
            role: 'member',
            createdById: adminUser!.id,
            status: 'used',
            usedAt: new Date(),
          },
          {
            tokenHash: 'h-rev',
            prefix: 'mki_test_',
            lastFour: 'b',
            role: 'member',
            createdById: adminUser!.id,
            status: 'revoked',
            revokedAt: new Date(),
          },
          {
            tokenHash: 'h-dis',
            prefix: 'mki_test_',
            lastFour: 'c',
            role: 'member',
            createdById: adminUser!.id,
            status: 'disabled',
            revokedAt: new Date(),
          },
          {
            tokenHash: 'h-exp',
            prefix: 'mki_test_',
            lastFour: 'd',
            role: 'member',
            createdById: adminUser!.id,
            status: 'unused',
            expiresAt: new Date(Date.now() - 86_400_000),
          },
          {
            tokenHash: 'h-live',
            prefix: 'mki_test_',
            lastFour: 'e',
            role: 'member',
            createdById: adminUser!.id,
            status: 'unused',
            expiresAt: new Date(Date.now() + 86_400_000),
          },
        ],
      });
      const res = await clearHistory(makeAdminDelete(cookie));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.deleted).toBe(4);
      const remaining = await prisma.invite.findMany();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].tokenHash).toBe('h-live');
    });
  });

  describe('GET /api/invites/[token]/state', () => {
    it("unknown token → { usable: false, reason: 'unknown' }, status 200 (case 22)", async () => {
      const fake = `mki_test_${'a'.repeat(64)}`;
      const res = await inviteState(new Request('http://l'), {
        params: Promise.resolve({ id: fake }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ usable: false, reason: 'unknown' });
    });

    it('used / expired / revoked / disabled → { usable: false, reason: <state> }, status 200 (case 23)', async () => {
      const cookie = await adminCookie();
      const adminUser = await prisma.user.findUnique({ where: { email: 'admin@x.com' } });

      // used
      const usedInvite = await mintInvite(cookie, { role: 'member', expiry: '7d' });
      await prisma.invite.update({
        where: { id: usedInvite.id },
        data: { status: 'used', usedAt: new Date() },
      });
      const r1 = await inviteState(new Request('http://l'), {
        params: Promise.resolve({ id: usedInvite.plaintext }),
      });
      expect(r1.status).toBe(200);
      expect(await r1.json()).toEqual({ usable: false, reason: 'used' });

      // revoked
      const revokedInvite = await mintInvite(cookie, { role: 'member', expiry: '7d' });
      await prisma.invite.update({
        where: { id: revokedInvite.id },
        data: { status: 'revoked', revokedAt: new Date() },
      });
      const r2 = await inviteState(new Request('http://l'), {
        params: Promise.resolve({ id: revokedInvite.plaintext }),
      });
      expect(r2.status).toBe(200);
      expect(await r2.json()).toEqual({ usable: false, reason: 'revoked' });

      // disabled
      const disabledInvite = await mintInvite(cookie, { role: 'member', expiry: '7d' });
      await prisma.invite.update({
        where: { id: disabledInvite.id },
        data: { status: 'disabled', revokedAt: new Date() },
      });
      const r3 = await inviteState(new Request('http://l'), {
        params: Promise.resolve({ id: disabledInvite.plaintext }),
      });
      expect(r3.status).toBe(200);
      expect(await r3.json()).toEqual({ usable: false, reason: 'disabled' });

      // expired (unused + past expiresAt)
      const expiredInvite = await mintInvite(cookie, { role: 'member', expiry: '24h' });
      await prisma.invite.update({
        where: { id: expiredInvite.id },
        data: { expiresAt: new Date(Date.now() - 86_400_000) },
      });
      const r4 = await inviteState(new Request('http://l'), {
        params: Promise.resolve({ id: expiredInvite.plaintext }),
      });
      expect(r4.status).toBe(200);
      expect(await r4.json()).toEqual({ usable: false, reason: 'expired' });

      void adminUser;
    });

    it('usable, no bound email → { usable: true, boundEmail: false } (case 24)', async () => {
      const cookie = await adminCookie();
      const created = await mintInvite(cookie, { email: null, role: 'member', expiry: '7d' });
      const res = await inviteState(new Request('http://l'), {
        params: Promise.resolve({ id: created.plaintext }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ usable: true, boundEmail: false });
    });

    it('usable, bound email → { usable: true, boundEmail: true }; bound email value never appears (case 25)', async () => {
      const cookie = await adminCookie();
      const created = await mintInvite(cookie, {
        email: 'bea@studio.io',
        role: 'member',
        expiry: '7d',
      });
      const res = await inviteState(new Request('http://l'), {
        params: Promise.resolve({ id: created.plaintext }),
      });
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(JSON.parse(text)).toEqual({ usable: true, boundEmail: true });
      expect(text).not.toContain('bea@studio.io');
    });
  });

  describe('POST /api/invites/[token]/redeem', () => {
    function makeRedeem(_token: string, body: unknown, ip = '7.7.7.7') {
      return new Request('http://l', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': ip,
        },
        body: JSON.stringify(body),
      });
    }

    it('happy path: creates a User with the invite role, sets mk_session, flips invite to used (case 26)', async () => {
      const cookie = await adminCookie();
      const created = await mintInvite(cookie, { email: null, role: 'member', expiry: '7d' });
      const res = await redeem(
        makeRedeem(created.plaintext, {
          email: 'newuser@x.com',
          password: 'longpassword12345',
          name: 'New User',
        }),
        { params: Promise.resolve({ id: created.plaintext }) },
      );
      expect(res.status).toBe(201);
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toMatch(/mk_session=/);
      expect(setCookie).toMatch(/HttpOnly/i);
      expect(setCookie).toMatch(/SameSite=lax/i);
      const newUser = await prisma.user.findUnique({ where: { email: 'newuser@x.com' } });
      expect(newUser).not.toBeNull();
      expect(newUser?.role).toBe('member');
      const row = await prisma.invite.findUnique({ where: { id: created.id } });
      expect(row?.status).toBe('used');
      expect(row?.usedById).toBe(newUser?.id);
      expect(row?.usedAt).not.toBeNull();
    });

    it('email mismatch on bound invite → 401 email_mismatch (case 27)', async () => {
      const cookie = await adminCookie();
      const created = await mintInvite(cookie, {
        email: 'bound@x.com',
        role: 'member',
        expiry: '7d',
      });
      const res = await redeem(
        makeRedeem(created.plaintext, {
          email: 'other@x.com',
          password: 'longpassword12345',
          name: 'Other',
        }),
        { params: Promise.resolve({ id: created.plaintext }) },
      );
      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe('email_mismatch');
      const row = await prisma.invite.findUnique({ where: { id: created.id } });
      expect(row?.failedAttempts).toBe(1);
    });

    it('email collision with existing user → 401 email_mismatch silent path (case 28)', async () => {
      const cookie = await adminCookie();
      const created = await mintInvite(cookie, { email: null, role: 'member', expiry: '7d' });
      await prisma.user.create({
        data: {
          email: 'taken@x.com',
          name: 'Existing',
          passwordHash: await hashPassword('longpassword12345'),
          role: 'member',
        },
      });
      const res = await redeem(
        makeRedeem(created.plaintext, {
          email: 'taken@x.com',
          password: 'longpassword12345',
          name: 'Collider',
        }),
        { params: Promise.resolve({ id: created.plaintext }) },
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('email_mismatch');
      // Anti-enumeration: no `email_in_use` code leaks.
      expect(JSON.stringify(body)).not.toContain('email_in_use');
    });

    it('password < 12 chars → 400 invalid_body; failedAttempts increments by 1 (case 29)', async () => {
      const cookie = await adminCookie();
      const created = await mintInvite(cookie, { email: null, role: 'member', expiry: '7d' });
      const res = await redeem(
        makeRedeem(created.plaintext, {
          email: 'foo@x.com',
          password: 'short',
          name: 'Foo',
        }),
        { params: Promise.resolve({ id: created.plaintext }) },
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('invalid_body');
      const row = await prisma.invite.findUnique({ where: { id: created.id } });
      expect(row?.failedAttempts).toBe(1);
    });

    it('per-token threshold: after 20 failures invite stays unused; 21st marks it disabled (case 30)', async () => {
      const cookie = await adminCookie();
      const created = await mintInvite(cookie, { email: null, role: 'member', expiry: '7d' });

      // 20 failed attempts with rotating IPs to bypass the per-IP rate limiter.
      for (let i = 0; i < 20; i++) {
        const ip = `10.0.0.${i + 1}`;
        inviteRedeemIpLimiter.reset(`invite-redeem:${ip}`);
        const r = await redeem(
          makeRedeem(created.plaintext, { email: 'x@x.com', password: 'short', name: 'X' }, ip),
          { params: Promise.resolve({ id: created.plaintext }) },
        );
        expect(r.status).toBe(400);
      }
      const after20 = await prisma.invite.findUnique({ where: { id: created.id } });
      expect(after20?.status).toBe('unused');
      expect(after20?.failedAttempts).toBe(20);

      // 21st failure → row flips to disabled.
      inviteRedeemIpLimiter.reset('invite-redeem:10.0.0.21');
      const r21 = await redeem(
        makeRedeem(
          created.plaintext,
          { email: 'x@x.com', password: 'short', name: 'X' },
          '10.0.0.21',
        ),
        { params: Promise.resolve({ id: created.plaintext }) },
      );
      expect(r21.status).toBe(400);
      const after21 = await prisma.invite.findUnique({ where: { id: created.id } });
      expect(after21?.status).toBe('disabled');
      expect(after21?.revokedAt).not.toBeNull();
    });

    it('per-IP rate-limit: 6th redeem from same IP → 429 with retry-after (case 31)', async () => {
      const cookie = await adminCookie();
      const created = await mintInvite(cookie, { email: null, role: 'member', expiry: '7d' });

      // Drain the bucket: 5 consume() calls in advance.
      for (let i = 0; i < 5; i++) {
        const r = inviteRedeemIpLimiter.consume('invite-redeem:1.2.3.4');
        expect(r.ok).toBe(true);
      }

      const res = await redeem(
        makeRedeem(
          created.plaintext,
          { email: 'x@x.com', password: 'longpassword12345', name: 'X' },
          '1.2.3.4',
        ),
        { params: Promise.resolve({ id: created.plaintext }) },
      );
      expect(res.status).toBe(429);
      expect(res.headers.get('retry-after')).toMatch(/^\d+$/);
    });

    it('after a 201 redeem, /state reports the token as used (case 33)', async () => {
      const cookie = await adminCookie();
      const created = await mintInvite(cookie, { email: null, role: 'member', expiry: '7d' });
      const ok = await redeem(
        makeRedeem(created.plaintext, {
          email: 'fresh@x.com',
          password: 'longpassword12345',
          name: 'Fresh',
        }),
        { params: Promise.resolve({ id: created.plaintext }) },
      );
      expect(ok.status).toBe(201);
      const state = await inviteState(new Request('http://l'), {
        params: Promise.resolve({ id: created.plaintext }),
      });
      expect(state.status).toBe(200);
      expect(await state.json()).toEqual({ usable: false, reason: 'used' });
    });

    it('a second sequential redeem of the same token returns 410 and creates no second user (case 34)', async () => {
      const cookie = await adminCookie();
      const created = await mintInvite(cookie, { email: null, role: 'member', expiry: '7d' });
      const r1 = await redeem(
        makeRedeem(
          created.plaintext,
          { email: 'first@x.com', password: 'longpassword12345', name: 'First' },
          '8.8.8.1',
        ),
        { params: Promise.resolve({ id: created.plaintext }) },
      );
      expect(r1.status).toBe(201);

      // Different IP so the per-IP rate limiter doesn't get in the way; different
      // email so the existing-user silent-collision path isn't what fails it.
      inviteRedeemIpLimiter.reset('invite-redeem:9.9.9.9');
      const r2 = await redeem(
        makeRedeem(
          created.plaintext,
          { email: 'second@x.com', password: 'longpassword12345', name: 'Second' },
          '9.9.9.9',
        ),
        { params: Promise.resolve({ id: created.plaintext }) },
      );
      expect(r2.status).toBe(410);
      expect((await r2.json()).error).toBe('invite_unusable');
      const secondUser = await prisma.user.findUnique({ where: { email: 'second@x.com' } });
      expect(secondUser).toBeNull();
    });

    it('race: two concurrent redeems → one 201 + one 410 invite_unusable (case 32)', async () => {
      const cookie = await adminCookie();
      const created = await mintInvite(cookie, { email: null, role: 'member', expiry: '7d' });

      // Different emails so user.create doesn't trip the unique constraint
      // — the contended row is the invite, not the user.
      const r1Promise = redeem(
        makeRedeem(
          created.plaintext,
          { email: 'race1@x.com', password: 'longpassword12345', name: 'Race 1' },
          '5.5.5.5',
        ),
        { params: Promise.resolve({ id: created.plaintext }) },
      );
      const r2Promise = redeem(
        makeRedeem(
          created.plaintext,
          { email: 'race2@x.com', password: 'longpassword12345', name: 'Race 2' },
          '6.6.6.6',
        ),
        { params: Promise.resolve({ id: created.plaintext }) },
      );

      const [r1, r2] = await Promise.all([r1Promise, r2Promise]);
      const statuses = [r1.status, r2.status].sort();
      expect(statuses).toEqual([201, 410]);

      const losing = r1.status === 410 ? r1 : r2;
      expect((await losing.json()).error).toBe('invite_unusable');

      const row = await prisma.invite.findUnique({ where: { id: created.id } });
      expect(row?.status).toBe('used');
    });
  });
});

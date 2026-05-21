import { NextResponse } from 'next/server';
import { z } from 'zod';
import { effectiveStatus, findInviteByPresentedToken } from '@/lib/auth/invite-token';
import { assertSameOrigin } from '@/lib/auth/origin';
import { hashPassword } from '@/lib/auth/password';
import { createSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { clientIp, inviteRedeemIpLimiter } from '@/lib/rate-limit';

const FAILED_ATTEMPTS_CAP = 20;

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(1).max(100),
});

async function bumpFailedAttempts(inviteId: string) {
  const updated = await prisma.invite
    .update({
      where: { id: inviteId, status: 'unused' },
      data: { failedAttempts: { increment: 1 } },
      select: { failedAttempts: true },
    })
    .catch(() => null);
  if (!updated) return;
  if (updated.failedAttempts > FAILED_ATTEMPTS_CAP) {
    await prisma.invite
      .update({
        where: { id: inviteId, status: 'unused' },
        data: { status: 'disabled', revokedAt: new Date() },
      })
      .catch(() => null);
  }
}

// URL segment is named `[id]` (not `[token]`) because Next.js requires
// a single dynamic-segment name per folder. The value here is the plaintext
// invite token; `params.id` is destructured into `token` below.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const ip = clientIp(req);
  const limit = inviteRedeemIpLimiter.consume(`invite-redeem:${ip}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }

  const { id: token } = await ctx.params;
  const invite = await findInviteByPresentedToken(token);
  if (!invite) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    await bumpFailedAttempts(invite.id);
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const eff = effectiveStatus(invite);
  if (eff !== 'unused') {
    return NextResponse.json({ error: 'invite_unusable' }, { status: 410 });
  }

  const presentedEmail = parsed.data.email.trim().toLowerCase();
  if (invite.email && invite.email.toLowerCase() !== presentedEmail) {
    await bumpFailedAttempts(invite.id);
    return NextResponse.json({ error: 'email_mismatch' }, { status: 401 });
  }

  // Silent collision: existing user → same error as bound mismatch.
  const existingUser = await prisma.user.findUnique({ where: { email: presentedEmail } });
  if (existingUser) {
    await bumpFailedAttempts(invite.id);
    return NextResponse.json({ error: 'email_mismatch' }, { status: 401 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  // Race-safe creation: WHERE status='unused' on the invite UPDATE.
  // If the row is no longer unused by the time we get here, the
  // updateMany returns count: 0 and we roll back via early return.
  const newUser = await prisma
    .$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: presentedEmail,
          name: parsed.data.name,
          passwordHash,
          role: invite.role,
        },
      });
      const flip = await tx.invite.updateMany({
        where: { id: invite.id, status: 'unused' },
        data: { status: 'used', usedAt: new Date(), usedById: user.id },
      });
      if (flip.count === 0) {
        throw new Error('invite_unusable_race');
      }
      return user;
    })
    .catch((err) => {
      if (err?.message === 'invite_unusable_race') {
        return { kind: 'race' as const };
      }
      logger.error({ event: 'invite_redeem_failed', err: String(err) }, 'redeem');
      return { kind: 'error' as const };
    });

  if (newUser && 'kind' in newUser) {
    if (newUser.kind === 'race') {
      return NextResponse.json({ error: 'invite_unusable' }, { status: 410 });
    }
    return NextResponse.json({ error: 'invite_redeem_failed' }, { status: 500 });
  }

  const { token: sessionToken } = await createSession(newUser.id);
  const res = NextResponse.json(
    { id: newUser.id, email: newUser.email, name: newUser.name },
    { status: 201 },
  );
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
  logger.info({ event: 'invite_redeemed', userId: newUser.id, inviteId: invite.id }, 'redeem');
  return res;
}

export const dynamic = 'force-dynamic';

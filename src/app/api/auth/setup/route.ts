import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin } from '@/lib/auth/origin';
import { hashPassword } from '@/lib/auth/password';
import { createSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session';
import { isSetupCompleted, markSetupCompleted } from '@/lib/auth/setup-state';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { clientIp, setupLimiter } from '@/lib/rate-limit';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(1).max(100),
});

// Public — first-run admin creation; no identity exists yet. Idempotent: the
// `setup_already_completed` 403 guards against re-running after the admin is in.
export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ip = clientIp(req);
  const limit = setupLimiter.consume(`setup:${ip}`);
  if (!limit.ok) {
    logger.warn({ event: 'setup_rate_limited', ip }, 'setup throttled');
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }
  if (await isSetupCompleted()) {
    return NextResponse.json({ error: 'setup_already_completed' }, { status: 403 });
  }
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
  }
  const passwordHash = await hashPassword(parsed.password);
  const user = await prisma.user.create({
    data: { email: parsed.email, name: parsed.name, passwordHash, role: 'admin' },
  });
  await markSetupCompleted();
  const { token } = await createSession(user.id);
  const res = NextResponse.json({ id: user.id, email: user.email, name: user.name });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
  return res;
}

export const dynamic = 'force-dynamic';

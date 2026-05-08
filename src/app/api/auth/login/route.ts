import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { clientIp, loginLimiter } from '@/lib/rate-limit';

const bodySchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = loginLimiter.consume(`login:${ip}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }
  const body = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: body.data.email } });
  if (!user || !(await verifyPassword(body.data.password, user.passwordHash))) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }
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

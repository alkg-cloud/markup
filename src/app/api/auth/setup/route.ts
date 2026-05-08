import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth/password';
import { createSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session';
import { isSetupCompleted, markSetupCompleted } from '@/lib/auth/setup-state';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(1).max(100),
});

export async function POST(req: Request) {
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

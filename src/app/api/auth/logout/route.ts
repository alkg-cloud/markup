import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { invalidateSession, SESSION_COOKIE } from '@/lib/auth/session';

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const id = await identify(req);
  if (id?.kind === 'user') await invalidateSession(id.sessionId);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const dynamic = 'force-dynamic';

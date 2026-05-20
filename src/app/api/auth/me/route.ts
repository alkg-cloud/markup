import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const id = await identify(req);
  if (!id) {
    // If the caller sent a session cookie that didn't resolve to an
    // identity (stale signature after AUTH_SECRET rotation, deleted
    // user, expired session row, etc.), instruct the browser to drop
    // it. Otherwise `useRequireAuth` will get 401, redirect to /login,
    // and the proxy will bounce /login back to / on cookie presence —
    // an infinite Loading… loop. Clearing the cookie here breaks the
    // loop at the source: the next request from this client has no
    // cookie and the proxy lets /login render.
    const res = NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const hasStaleCookie = req.headers
      .get('cookie')
      ?.split(/;\s*/)
      .some((part) => part.startsWith(`${SESSION_COOKIE}=`));
    if (hasStaleCookie) res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  if (id.kind === 'user') {
    const user = await prisma.user.findUnique({ where: { id: id.userId } });
    return NextResponse.json({ kind: 'user', id: user?.id, email: user?.email, name: user?.name });
  }
  return NextResponse.json({ kind: 'agent', id: id.tokenId, name: id.name });
}

export const dynamic = 'force-dynamic';

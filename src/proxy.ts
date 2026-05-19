import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Edge-runtime proxy (Next.js 16 successor to `middleware.ts`). Runs
// before any React mount and before any page renders so unauthenticated
// traffic to an in-shell route never sees the page shell.
//
// What it does (cookie-presence only, no Prisma — the edge runtime can't
// load the node-only `prisma` client):
//
//  - `/login` or `/setup` with a session cookie → bounce to `/`.
//  - Any in-shell route without a session cookie → bounce to `/login`.
//
// The real validity check happens client-side via `useRequireAuth()`,
// which calls `GET /api/auth/me` and redirects on 401. The proxy only
// handles the "cookie missing" cheap case so first-paint navigation is
// honest.
const SESSION_COOKIE = 'mk_session';

const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/setup',
  '/api/', // API routes do their own auth
  '/m/', // mockup serve route auth-checks per request
  '/_next/',
  '/favicon',
  '/icon',
  '/robots',
  '/sitemap',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.get(SESSION_COOKIE)?.value;

  if (hasSession && (pathname === '/login' || pathname === '/setup')) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  if (!hasSession && !isPublicPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Skip Next.js internals and static assets. The matcher is intentionally
// broad so every in-shell route runs through the cookie check.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg).*)'],
};

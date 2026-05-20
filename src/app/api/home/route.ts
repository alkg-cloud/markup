import { NextResponse } from 'next/server';

import { handleAuthError, identify } from '@/lib/auth/identify';
import { getHomeData } from '@/lib/home/service';
import type { HomeIdentity } from '@/lib/home/types';
import { prisma } from '@/lib/prisma';

/**
 * `GET /api/home` — workspace home aggregator.
 *
 * Returns identity snapshot + greeting + recents + projects + orphans so the
 * `/` landing renders in one round-trip. See
 * `docs/superpowers/specs/2026-05-20-projects-home-implementation-spec.md`
 * §2.1 for the response contract.
 *
 * Auth: requires an identified caller. Agent tokens are rejected — the home
 * page is user-facing only.
 */
export async function GET(req: Request) {
  try {
    const id = await identify(req);
    if (!id || id.kind !== 'user') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const userRow = await prisma.user.findUnique({
      where: { id: id.userId },
      select: { name: true, email: true, role: true },
    });
    const identity: HomeIdentity = {
      name: userRow?.name ?? null,
      email: userRow?.email ?? null,
      role: userRow?.role === 'admin' ? 'admin' : 'member',
    };
    const data = await getHomeData(identity);
    return NextResponse.json(data);
  } catch (e) {
    return handleAuthError(e);
  }
}

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { identify, requireAdmin } from '@/lib/auth/identify';
import { promoteVersion } from '@/lib/mockup/version-service';

interface ErrorWithStatus extends Error {
  status?: number;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) {
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    const err = e as ErrorWithStatus;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
  const { id, vid } = await ctx.params;
  try {
    await promoteVersion(id, vid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as ErrorWithStatus;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
}

export const dynamic = 'force-dynamic';

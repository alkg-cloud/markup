import { NextResponse } from 'next/server';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { promoteVersion } from '@/lib/mockup/version-service';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
  }
  const { id, vid } = await ctx.params;
  try {
    await promoteVersion(id, vid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleAuthError(e);
  }
}

export const dynamic = 'force-dynamic';

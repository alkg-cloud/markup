import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { moveFolder } from '@/lib/project/service';

const moveSchema = z.object({
  parentId: z.string().min(1).nullable(),
  position: z.number().int().min(0),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
  }
  const { id } = await ctx.params;
  const parsed = moveSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const result = await moveFolder({ folderId: id, ...parsed.data });
  if ('error' in result) {
    const code = result.error;
    const is404 = code === 'not_found' || code === 'parent_not_found';
    return NextResponse.json({ error: code }, { status: is404 ? 404 : 409 });
  }
  return NextResponse.json(result.folder);
}

export const dynamic = 'force-dynamic';

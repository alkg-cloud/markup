import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdminFor } from '@/lib/auth/require-owner-or-admin';
import { moveMockup } from '@/lib/project/service';

const moveSchema = z.object({
  projectId: z.string().min(1),
  folderId: z.string().min(1).nullable(),
  position: z.number().int().min(0),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ident = await identify(req);
  const { id } = await ctx.params;

  const gate = await requireOwnerOrAdminFor(ident, 'mockup', id);
  if (gate instanceof NextResponse) return gate;

  const parsed = moveSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const result = await moveMockup({ mockupId: id, ...parsed.data });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result.mockup);
}

export const dynamic = 'force-dynamic';

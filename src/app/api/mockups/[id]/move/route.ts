import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAuthError, identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdmin } from '@/lib/auth/require-owner-or-admin';
import { prisma } from '@/lib/prisma';
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

  const mockup = await prisma.mockup.findUnique({
    where: { id },
    select: { id: true, createdBy: true, createdByType: true },
  });
  if (!mockup) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    await requireOwnerOrAdmin(ident, {
      kind: 'mockup',
      createdBy: mockup.createdBy,
      createdByType: mockup.createdByType as 'user' | 'agent' | null,
    });
  } catch (e) {
    return handleAuthError(e);
  }

  const parsed = moveSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const result = await moveMockup({ mockupId: id, ...parsed.data });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result.mockup);
}

export const dynamic = 'force-dynamic';

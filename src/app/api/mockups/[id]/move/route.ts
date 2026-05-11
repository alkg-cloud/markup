import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identify, requireAdmin } from '@/lib/auth/identify';
import { moveMockup } from '@/lib/project/service';

interface ErrorWithStatus extends Error {
  status?: number;
}

const moveSchema = z.object({
  projectId: z.string().min(1),
  folderId: z.string().min(1).nullable(),
  position: z.number().int().min(0),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    const err = e as ErrorWithStatus;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
  const { id } = await ctx.params;
  const parsed = moveSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const result = await moveMockup({ mockupId: id, ...parsed.data });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result.mockup);
}

export const dynamic = 'force-dynamic';

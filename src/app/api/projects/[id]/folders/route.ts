import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identify, requireAdmin } from '@/lib/auth/identify';
import { createFolder } from '@/lib/project/service';

interface ErrorWithStatus extends Error {
  status?: number;
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().min(1).nullish(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    const err = e as ErrorWithStatus;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
  const { id: projectId } = await ctx.params;
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const result = await createFolder({
    projectId,
    name: parsed.data.name,
    parentId: parsed.data.parentId ?? null,
  });

  if ('error' in result) {
    const code = result.error;
    const is404 = code === 'project_not_found' || code === 'parent_not_found';
    return NextResponse.json({ error: code }, { status: is404 ? 404 : 409 });
  }

  return NextResponse.json(result.folder, { status: 201 });
}

export const dynamic = 'force-dynamic';

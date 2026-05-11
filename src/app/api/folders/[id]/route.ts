import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identify, requireAdmin } from '@/lib/auth/identify';
import { deleteFolder, getFolder, updateFolder } from '@/lib/project/service';

interface ErrorWithStatus extends Error {
  status?: number;
}

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const folder = await getFolder(id);
  if (!folder) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(folder);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    const err = e as ErrorWithStatus;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const result = await updateFolder(id, parsed.data);
  if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json(result.folder);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    const err = e as ErrorWithStatus;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
  const { id } = await ctx.params;
  const deleted = await deleteFolder(id);
  if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ id: deleted.id });
}

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identify, requireAdmin } from '@/lib/auth/identify';
import { reorderProjects } from '@/lib/project/service';

interface ErrorWithStatus extends Error {
  status?: number;
}

const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function POST(req: Request) {
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    const err = e as ErrorWithStatus;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
  const parsed = reorderSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const result = await reorderProjects(parsed.data.ids);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';

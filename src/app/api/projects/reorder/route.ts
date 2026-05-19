import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { reorderProjects } from '@/lib/project/service';

const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
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

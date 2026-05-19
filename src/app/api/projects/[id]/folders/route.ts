import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { createFolder } from '@/lib/project/service';
import { urlSafeNameSchema } from '@/lib/validation/url-safe-name';

const createSchema = z.object({
  name: urlSafeNameSchema(255),
  parentId: z.string().min(1).nullish(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
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

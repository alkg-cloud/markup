import { NextResponse } from 'next/server';
import { updateAnnotationTldraw } from '@/lib/annotation/service';
import { identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdminFor } from '@/lib/auth/require-owner-or-admin';

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ident = await identify(req);
  const { id } = await ctx.params;

  const gate = await requireOwnerOrAdminFor(ident, 'annotation', id);
  if (gate instanceof NextResponse) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const updated = await updateAnnotationTldraw(id, body);
  if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ('error' in updated) return NextResponse.json({ error: updated.error }, { status: 400 });
  return NextResponse.json({ id: updated.id }, { status: 200 });
}

export const dynamic = 'force-dynamic';

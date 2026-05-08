import { NextResponse } from 'next/server';
import { updateAnnotationTldraw } from '@/lib/annotation/service';
import { identify } from '@/lib/auth/identify';

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
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
  return NextResponse.json({ id: updated.id }, { status: 200 });
}

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { updateAnnotationTldraw } from '@/lib/annotation/service';
import { handleAuthError, identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdmin } from '@/lib/auth/require-owner-or-admin';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ident = await identify(req);
  const { id } = await ctx.params;

  const annotation = await prisma.annotation.findUnique({
    where: { id },
    select: { id: true, createdBy: true, createdByType: true },
  });
  if (!annotation) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    await requireOwnerOrAdmin(ident, {
      kind: 'annotation',
      createdBy: annotation.createdBy,
      createdByType: annotation.createdByType as 'user' | 'agent',
    });
  } catch (e) {
    return handleAuthError(e);
  }

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

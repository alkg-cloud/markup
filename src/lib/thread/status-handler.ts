import 'server-only';
import { NextResponse } from 'next/server';
import { narrowCreatedByType } from '@/lib/auth/can-delete';
import { handleAuthError, identify, identityId } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdmin } from '@/lib/auth/require-owner-or-admin';
import { prisma } from '@/lib/prisma';
import { setThreadStatus } from './service';

export async function handleThreadStatusChange(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
  status: 'open' | 'resolved',
): Promise<Response> {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ident = await identify(req);
  const { id: threadId } = await ctx.params;

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { annotation: { select: { createdBy: true, createdByType: true } } },
  });
  if (!thread) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    await requireOwnerOrAdmin(ident, {
      kind: 'annotation',
      createdBy: thread.annotation.createdBy,
      createdByType: narrowCreatedByType(thread.annotation.createdByType) as 'user' | 'agent',
    });
  } catch (e) {
    return handleAuthError(e);
  }

  // ident is guaranteed Identity at this point (requireOwnerOrAdmin throws 401 via requireIdentity).
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  await setThreadStatus(threadId, status, { id: identityId(ident), kind: ident.kind });
  return NextResponse.json({ ok: true, status });
}

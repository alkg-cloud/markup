import { NextResponse } from 'next/server';
import { handleAuthError, identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdmin } from '@/lib/auth/require-owner-or-admin';
import { prisma } from '@/lib/prisma';
import { setThreadStatus } from '@/lib/thread/service';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ident = await identify(req);
  const { id: threadId } = await ctx.params;

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: {
      annotation: { select: { createdBy: true, createdByType: true } },
    },
  });
  if (!thread) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    await requireOwnerOrAdmin(ident, {
      kind: 'annotation',
      createdBy: thread.annotation.createdBy,
      createdByType: thread.annotation.createdByType as 'user' | 'agent',
    });
  } catch (e) {
    return handleAuthError(e);
  }

  await setThreadStatus(threadId, 'open', {
    id: ident!.kind === 'user' ? ident!.userId : ident!.tokenId,
    kind: ident!.kind,
  });
  return NextResponse.json({ ok: true, status: 'open' });
}

export const dynamic = 'force-dynamic';

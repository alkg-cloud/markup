import { NextResponse } from 'next/server';
import { effectiveStatus, findInviteByPresentedToken } from '@/lib/auth/invite-token';

// URL segment is named `[id]` (not `[token]`) because Next.js requires
// a single dynamic-segment name per folder, and DELETE /api/invites/[id]
// already owns this slot. Semantically, the value here is the plaintext
// invite token, not the cuid — `params.id` is destructured into `token`
// below to keep the rest of the handler honest.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: token } = await ctx.params;
  const invite = await findInviteByPresentedToken(token);
  if (!invite) {
    return NextResponse.json({ usable: false, reason: 'unknown' });
  }
  const eff = effectiveStatus(invite);
  if (eff !== 'unused') {
    return NextResponse.json({ usable: false, reason: eff });
  }
  return NextResponse.json({ usable: true, boundEmail: invite.email !== null });
}

export const dynamic = 'force-dynamic';

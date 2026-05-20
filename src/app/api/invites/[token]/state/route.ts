import { NextResponse } from 'next/server';
import { effectiveStatus, findInviteByPresentedToken } from '@/lib/auth/invite-token';

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
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

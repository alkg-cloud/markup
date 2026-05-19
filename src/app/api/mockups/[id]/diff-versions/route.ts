import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { resolveDiffParams } from '@/lib/mockup/diff-resolve';
import { pathForMockup } from '@/lib/mockup/url';

// Aggregator for `/mockups/[id]/diff` — resolves the from/to version
// pair against the mockup and returns the timestamps + canonical viewer
// href the client page needs to render the side-by-side compare. The
// page itself stays client-side; this route owns the Prisma reads.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id: mockupId } = await ctx.params;
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const resolved = await resolveDiffParams(mockupId, from, to);
  if (resolved.kind === 'not_found') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const viewerHref = (await pathForMockup(mockupId)) ?? '/';
  if (resolved.kind === 'invalid') {
    return NextResponse.json({ kind: 'invalid', viewerHref });
  }
  return NextResponse.json({
    kind: 'ok',
    viewerHref,
    from: { id: resolved.from.id, createdAt: resolved.from.createdAt.toISOString() },
    to: { id: resolved.to.id, createdAt: resolved.to.createdAt.toISOString() },
  });
}

export const dynamic = 'force-dynamic';

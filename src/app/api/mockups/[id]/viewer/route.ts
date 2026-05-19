import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { buildViewerPayload } from '@/lib/mockup/viewer-payload';

// Aggregator for the mockup viewer client page. The previous server
// component (`MockupViewerPage.tsx`) built this same payload inline; the
// CSR refactor moved the construction into `buildViewerPayload` so both
// the API route and any future server caller share one code path.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const result = await buildViewerPayload(id, ident);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json(result.data);
}

export const dynamic = 'force-dynamic';

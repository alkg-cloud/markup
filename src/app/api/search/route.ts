import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identify } from '@/lib/auth/identify';
import { search } from '@/lib/search/service';

const querySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: Request) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const raw = { q: url.searchParams.get('q') ?? '', limit: url.searchParams.get('limit') ?? 20 };
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
  }

  const { q, limit } = parsed.data;
  const results = await search(q, limit);
  return NextResponse.json({ query: q, results });
}

export const dynamic = 'force-dynamic';

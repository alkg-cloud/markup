import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getAnnotation } from '@/lib/annotation/service';
import { identify } from '@/lib/auth/identify';
import { env } from '@/lib/env';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return new NextResponse('unauthorized', { status: 401 });
  const { id } = await ctx.params;
  const annotation = await getAnnotation(id);
  if (!annotation) return new NextResponse('not found', { status: 404 });
  const abs = path.join(env().DATA_DIR, annotation.screenshotPath);
  if (!fs.existsSync(abs)) return new NextResponse('not found', { status: 404 });
  const buf = fs.readFileSync(abs);
  return new NextResponse(buf, {
    status: 200,
    headers: { 'content-type': 'image/png', 'cache-control': 'private, max-age=300' },
  });
}

export const dynamic = 'force-dynamic';

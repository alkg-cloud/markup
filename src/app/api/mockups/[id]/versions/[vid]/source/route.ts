import fs from 'node:fs';
import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { env } from '@/lib/env';
import { versionSourceZipPath } from '@/lib/mockup/storage';

export async function GET(req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, vid } = await ctx.params;
  const filePath = versionSourceZipPath(env().DATA_DIR, id, vid);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const stream = fs.createReadStream(filePath) as unknown as ReadableStream;
  return new NextResponse(stream, {
    status: 200,
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="mockup-${id}-${vid}.zip"`,
      'cache-control': 'private, no-cache',
    },
  });
}

export const dynamic = 'force-dynamic';

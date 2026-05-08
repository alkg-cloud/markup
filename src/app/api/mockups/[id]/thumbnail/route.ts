import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { env } from '@/lib/env';
import { thumbnailPath } from '@/lib/mockup/storage';
import { prisma } from '@/lib/prisma';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const mockup = await prisma.mockup.findUnique({ where: { id } });
  if (!mockup) return new NextResponse('not found', { status: 404 });
  const filePath = thumbnailPath(env().DATA_DIR, id);
  if (!fs.existsSync(filePath)) return new NextResponse('not found', { status: 404 });
  const buf = fs.readFileSync(filePath);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'content-type': 'image/png',
      'cache-control': 'private, max-age=300',
    },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const mockup = await prisma.mockup.findUnique({ where: { id } });
  if (!mockup) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const fd = await req.formData();
  const file = fd.get('thumbnail');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (file.size > MAX_THUMBNAIL_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) {
    return NextResponse.json({ error: 'not_png' }, { status: 400 });
  }
  const target = thumbnailPath(env().DATA_DIR, id);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buf);
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';

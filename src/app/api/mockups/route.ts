import fs from 'node:fs';
import path from 'node:path';
import cuid from 'cuid';
import { NextResponse } from 'next/server';
import { identify, requireIdentity } from '@/lib/auth/identify';
import { env } from '@/lib/env';
import { createMockupFromZip, listMockups } from '@/lib/mockup/service';

const VALID_STATUSES = ['open', 'resolved', 'archived'] as const;
type Status = (typeof VALID_STATUSES)[number];

interface ErrorWithStatus extends Error {
  status?: number;
}

export async function POST(req: Request) {
  let id;
  try {
    id = await identify(req);
    requireIdentity(id);
  } catch (e) {
    const err = e as ErrorWithStatus;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 });
  }

  const fd = await req.formData();
  const name = fd.get('name');
  const file = fd.get('build');
  if (typeof name !== 'string' || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const tmpDir = path.join(env().DATA_DIR, 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmp = path.join(tmpDir, `mk-upload-${cuid()}.zip`);
  fs.writeFileSync(tmp, Buffer.from(await file.arrayBuffer()));

  try {
    const result = await createMockupFromZip({
      name,
      zipPath: tmp,
      createdBy: id.kind === 'user' ? id.userId : id.tokenId,
      createdByType: id.kind,
    });
    return NextResponse.json(
      {
        id: result.mockup.id,
        currentVersionId: result.mockup.currentVersionId,
        slug: result.mockup.slug,
        name: result.mockup.name,
        status: result.mockup.status,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'upload_rejected', detail: (err as Error).message },
      { status: 400 },
    );
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

export async function GET(req: Request) {
  const id = await identify(req);
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status') ?? 'open,resolved';
  const status: Status[] =
    statusParam === 'all'
      ? [...VALID_STATUSES]
      : statusParam.split(',').filter((s): s is Status => VALID_STATUSES.includes(s as Status));
  if (status.length === 0) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? 50);
  const result = await listMockups({ status, cursor, limit });
  return NextResponse.json({
    items: result.items.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      status: m.status,
      currentVersionId: m.currentVersionId,
      updatedAt: m.updatedAt,
    })),
    nextCursor: result.nextCursor,
  });
}

export const dynamic = 'force-dynamic';

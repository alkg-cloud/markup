import fs from 'node:fs';
import path from 'node:path';
import cuid from 'cuid';
import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { env } from '@/lib/env';
import { addVersion } from '@/lib/mockup/service';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await identify(req);
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id: mockupId } = await ctx.params;
  const fd = await req.formData();
  const file = fd.get('build');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const tmpDir = path.join(env().DATA_DIR, 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmp = path.join(tmpDir, `mk-upload-${cuid()}.zip`);
  fs.writeFileSync(tmp, Buffer.from(await file.arrayBuffer()));

  try {
    const version = await addVersion({
      mockupId,
      zipPath: tmp,
      createdBy: id.kind === 'user' ? id.userId : id.tokenId,
      createdByType: id.kind,
    });
    return NextResponse.json(
      { id: version.id, mockupId, createdAt: version.createdAt },
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

export const dynamic = 'force-dynamic';

import fs from 'node:fs';
import path from 'node:path';
import cuid from 'cuid';
import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { env } from '@/lib/env';
import { addVersion, wrapHtmlAsZip } from '@/lib/mockup/service';
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const id = await identify(req);
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Mirror the size guard in POST /api/mockups — replace-as-new-version
  // shares the same ceiling so a single drop can't smuggle past the cap
  // by toggling the dialog to "Replace" mode. Source of truth is
  // `env().MAX_UPLOAD_MB` (see `src/lib/env.ts`).
  const maxUploadBytes = env().MAX_UPLOAD_MB * 1024 * 1024;
  const contentLength = req.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxUploadBytes) {
    return NextResponse.json({ error: 'file_too_large', limit: maxUploadBytes }, { status: 413 });
  }

  const { id: mockupId } = await ctx.params;
  const fd = await req.formData();
  const file = fd.get('build');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > maxUploadBytes) {
    return NextResponse.json({ error: 'file_too_large', limit: maxUploadBytes }, { status: 413 });
  }

  // Same content-type routing as POST /api/mockups (see route.ts) — a
  // raw HTML drop becomes a single-entry `index.html` zip; anything
  // else is buffered straight to the zip path.
  const filename = file instanceof File ? file.name : '';
  const mime = file.type.toLowerCase();
  const lowerName = filename.toLowerCase();
  const isHtml =
    mime === 'text/html' || (mime !== 'application/zip' && lowerName.endsWith('.html'));

  const tmpDir = path.join(env().DATA_DIR, 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  let tmp = path.join(tmpDir, `mk-upload-${cuid()}.zip`);
  if (isHtml) {
    tmp = await wrapHtmlAsZip(buffer);
  } else {
    fs.writeFileSync(tmp, buffer);
  }

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

import fs from 'node:fs';
import path from 'node:path';
import cuid from 'cuid';
import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { env } from '@/lib/env';
import { createMockupFromZip, listMockups, wrapHtmlAsZip } from '@/lib/mockup/service';
import { prisma } from '@/lib/prisma';
import { URL_SAFE_NAME_PATTERN } from '@/lib/validation/url-safe-name';

const VALID_STATUSES = ['open', 'resolved', 'archived'] as const;
type Status = (typeof VALID_STATUSES)[number];

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const id = await identify(req);
  if (!id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Defense in depth: the client already validates against the same cap
  // before sending, but a hostile or buggy client can still hand us
  // multi-GB bodies. Reject by content-length before buffering anything
  // into memory. The limit reads from `env().MAX_UPLOAD_MB` so the
  // route guard, the zip-extractor cap, and the client-side preview cap
  // all derive from the same source — see `src/lib/env.ts`.
  const maxUploadBytes = env().MAX_UPLOAD_MB * 1024 * 1024;
  const contentLength = req.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxUploadBytes) {
    return NextResponse.json({ error: 'file_too_large', limit: maxUploadBytes }, { status: 413 });
  }

  const fd = await req.formData();
  const name = fd.get('name');
  const slug = fd.get('slug');
  const file = fd.get('build');
  if (typeof name !== 'string' || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!URL_SAFE_NAME_PATTERN.test(name)) {
    return NextResponse.json({ error: 'name_not_url_safe' }, { status: 400 });
  }
  if (slug != null && typeof slug !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const projectId = fd.get('projectId');
  const folderId = fd.get('folderId');
  if (projectId != null && typeof projectId !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (folderId != null && typeof folderId !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (typeof projectId === 'string') {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 400 });
  }
  if (typeof folderId === 'string') {
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) return NextResponse.json({ error: 'folder_not_found' }, { status: 400 });
    if (typeof projectId === 'string' && folder.projectId !== projectId) {
      return NextResponse.json({ error: 'folder_project_mismatch' }, { status: 400 });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Secondary guard: a client can send chunked transfer-encoding with
  // no content-length, so the header check above can be bypassed by
  // streaming. Re-check the actual buffered size before we touch disk.
  if (buffer.byteLength > maxUploadBytes) {
    return NextResponse.json({ error: 'file_too_large', limit: maxUploadBytes }, { status: 413 });
  }

  // The `build` field can be either a full zip (existing path used by
  // agents + the legacy upload UI) or a raw HTML document (used by the
  // new drag-drop flow so the browser doesn't have to depend on JSZip).
  // We branch on MIME first, then file extension — some browsers tag
  // `.html` drops as `application/octet-stream`, so the extension is
  // the load-bearing hint when the MIME is unhelpful.
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
    const result = await createMockupFromZip({
      name,
      slug: typeof slug === 'string' ? slug : undefined,
      zipPath: tmp,
      createdBy: id.kind === 'user' ? id.userId : id.tokenId,
      createdByType: id.kind,
      projectId: typeof projectId === 'string' ? projectId : undefined,
      folderId: typeof folderId === 'string' ? folderId : undefined,
    });
    return NextResponse.json(
      {
        id: result.mockup.id,
        currentVersionId: result.mockup.currentVersionId,
        slug: result.mockup.slug,
        name: result.mockup.name,
        status: result.mockup.status,
        projectId: result.mockup.projectId,
        folderId: result.mockup.folderId,
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

import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import cuid from 'cuid';
import JSZip from 'jszip';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { thumbnailPath, versionBuildDir, versionSourceZipPath } from './storage';
import { generateThumbnailFromBuildDir } from './thumbnail-generator';
import { extractZip } from './zip-extractor';

interface CreateInput {
  name: string;
  slug?: string;
  zipPath: string;
  createdBy: string;
  createdByType: 'user' | 'agent';
  projectId?: string;
  folderId?: string;
}

function buildLimits() {
  return {
    maxTotalBytes: env().MAX_UPLOAD_MB * 1024 * 1024,
    maxFiles: env().MAX_FILES_PER_UPLOAD,
    maxFileBytes: env().MAX_FILE_SIZE_MB * 1024 * 1024,
  };
}

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return base || 'mockup';
}

async function ensureUniqueSlug(name: string, ignoreId?: string): Promise<string> {
  const base = makeSlug(name);
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? base : `${base}-${i}`;
    const existing = await prisma.mockup.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === ignoreId) return candidate;
  }
  return `${base}-${cuid().slice(-6)}`;
}

/**
 * Rename a mockup and regenerate its slug so the canonical path-based
 * URL (`/projects/<slug>/.../<mockup-slug>`) keeps reading the latest
 * name. Returns the updated row, or `null` if the mockup doesn't
 * exist.
 */
export async function renameMockup(id: string, name: string) {
  const existing = await prisma.mockup.findUnique({ where: { id } });
  if (!existing) return null;
  const renamed = name !== existing.name;
  const slug = renamed ? await ensureUniqueSlug(name, id) : existing.slug;
  return prisma.mockup.update({ where: { id }, data: { name, slug } });
}

export async function createMockupFromZip(input: CreateInput) {
  const root = env().DATA_DIR;
  const mid = cuid();
  const vid = cuid();
  const buildPath = versionBuildDir(root, mid, vid);
  fs.mkdirSync(buildPath, { recursive: true });
  const result = await extractZip(input.zipPath, buildPath, buildLimits());
  fs.copyFileSync(input.zipPath, versionSourceZipPath(root, mid, vid));
  const thumb = result.thumbnail ?? (await generateThumbnailFromBuildDir(buildPath));
  if (thumb) {
    fs.writeFileSync(thumbnailPath(root, mid), thumb);
  }
  const slug = await ensureUniqueSlug(input.slug || input.name);
  await prisma.mockup.create({
    data: {
      id: mid,
      name: input.name,
      slug,
      status: 'open',
      projectId: input.projectId ?? null,
      folderId: input.folderId ?? null,
    },
  });
  const version = await prisma.mockupVersion.create({
    data: {
      id: vid,
      mockupId: mid,
      number: 1,
      path: path.posix.join('mockups', mid, 'versions', vid, 'build'),
      createdBy: input.createdBy,
      createdByType: input.createdByType,
    },
  });
  const mockup = await prisma.mockup.update({
    where: { id: mid },
    data: { currentVersionId: vid },
  });
  return { mockup, version };
}

export async function addVersion(input: {
  mockupId: string;
  zipPath: string;
  createdBy: string;
  createdByType: 'user' | 'agent';
}) {
  const root = env().DATA_DIR;
  const vid = cuid();
  const buildPath = versionBuildDir(root, input.mockupId, vid);
  fs.mkdirSync(buildPath, { recursive: true });
  const result = await extractZip(input.zipPath, buildPath, buildLimits());
  fs.copyFileSync(input.zipPath, versionSourceZipPath(root, input.mockupId, vid));
  const thumb = result.thumbnail ?? (await generateThumbnailFromBuildDir(buildPath));
  if (thumb) {
    fs.writeFileSync(thumbnailPath(root, input.mockupId), thumb);
  }
  // `number` is the high-water mark within the mockup. We use the
  // maximum existing number rather than the row count so deleting v1
  // leaves the next-created version at v(N+1), not v(N) again.
  //
  // Concurrent uploads to the same mockup race on `max(number)+1` — if
  // two callers read the same maximum the second one trips the
  // `@@unique([mockupId, number])` invariant (`P2002`). We retry on
  // that specific conflict so the second upload settles at the next
  // free number. A couple of retries is plenty since contention only
  // appears under simultaneous uploads from the same mockup, which is
  // already rare; the limit caps the worst case at `O(retries)` calls
  // before surfacing the error.
  const version = await createVersionRowWithRetry({
    mockupId: input.mockupId,
    vid,
    path: path.posix.join('mockups', input.mockupId, 'versions', vid, 'build'),
    createdBy: input.createdBy,
    createdByType: input.createdByType,
  });
  await prisma.mockup.update({
    where: { id: input.mockupId },
    data: { currentVersionId: vid },
  });
  return version;
}

const VERSION_NUMBER_RETRIES = 5;
async function createVersionRowWithRetry(input: {
  mockupId: string;
  vid: string;
  path: string;
  createdBy: string;
  createdByType: 'user' | 'agent';
}) {
  for (let attempt = 0; attempt < VERSION_NUMBER_RETRIES; attempt++) {
    const { _max } = await prisma.mockupVersion.aggregate({
      where: { mockupId: input.mockupId },
      _max: { number: true },
    });
    const nextNumber = (_max.number ?? 0) + 1;
    try {
      return await prisma.mockupVersion.create({
        data: {
          id: input.vid,
          mockupId: input.mockupId,
          number: nextNumber,
          path: input.path,
          createdBy: input.createdBy,
          createdByType: input.createdByType,
        },
      });
    } catch (err) {
      // Prisma's `PrismaClientKnownRequestError` carries `code: 'P2002'`
      // on a unique-constraint violation. We can't `instanceof`-check
      // without importing the runtime class, so duck-type on the code.
      const e = err as { code?: string };
      if (e?.code !== 'P2002') throw err;
      // Concurrent upload won the race; loop to re-read max and try the
      // next number.
    }
  }
  throw new Error('version_number_contention');
}

export async function addVersionFromFiles(input: {
  mockupId: string;
  files: Record<string, Buffer>;
  createdBy: string;
  createdByType: 'user' | 'agent';
}) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(input.files)) {
    zip.file(name, content);
  }
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const tmpDir = path.join(env().DATA_DIR, 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpZip = path.join(tmpDir, `version-${cuid()}.zip`);
  fs.writeFileSync(tmpZip, buffer);
  try {
    return await addVersion({
      mockupId: input.mockupId,
      zipPath: tmpZip,
      createdBy: input.createdBy,
      createdByType: input.createdByType,
    });
  } finally {
    try {
      fs.unlinkSync(tmpZip);
    } catch {
      // ignore
    }
  }
}

export async function getMockup(id: string) {
  return prisma.mockup.findUnique({
    where: { id },
    include: { versions: { orderBy: { createdAt: 'desc' } } },
  });
}

export async function listMockups(opts: { status: string[]; cursor?: string; limit?: number }) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const items = await prisma.mockup.findMany({
    where: { status: { in: opts.status } },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
  let nextCursor: string | null = null;
  if (items.length > limit) {
    const last = items.pop();
    if (last) nextCursor = last.id;
  }
  return { items, nextCursor };
}

export async function setMockupStatus(id: string, status: 'open' | 'resolved' | 'archived') {
  return prisma.mockup.update({ where: { id }, data: { status } });
}

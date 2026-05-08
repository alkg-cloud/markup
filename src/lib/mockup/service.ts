import fs from 'node:fs';
import path from 'node:path';
import cuid from 'cuid';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { thumbnailPath, versionBuildDir, versionSourceZipPath } from './storage';
import { extractZip } from './zip-extractor';

interface CreateInput {
  name: string;
  zipPath: string;
  createdBy: string;
  createdByType: 'user' | 'agent';
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

async function ensureUniqueSlug(name: string): Promise<string> {
  const base = makeSlug(name);
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? base : `${base}-${i}`;
    if (!(await prisma.mockup.findUnique({ where: { slug: candidate } }))) return candidate;
  }
  return `${base}-${cuid().slice(-6)}`;
}

export async function createMockupFromZip(input: CreateInput) {
  const root = env().DATA_DIR;
  const mid = cuid();
  const vid = cuid();
  const buildPath = versionBuildDir(root, mid, vid);
  fs.mkdirSync(buildPath, { recursive: true });
  const result = await extractZip(input.zipPath, buildPath, buildLimits());
  fs.copyFileSync(input.zipPath, versionSourceZipPath(root, mid, vid));
  if (result.thumbnail) {
    fs.writeFileSync(thumbnailPath(root, mid), result.thumbnail);
  }
  const slug = await ensureUniqueSlug(input.name);
  await prisma.mockup.create({
    data: { id: mid, name: input.name, slug, status: 'open' },
  });
  const version = await prisma.mockupVersion.create({
    data: {
      id: vid,
      mockupId: mid,
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
  if (result.thumbnail) {
    fs.writeFileSync(thumbnailPath(root, input.mockupId), result.thumbnail);
  }
  const version = await prisma.mockupVersion.create({
    data: {
      id: vid,
      mockupId: input.mockupId,
      path: path.posix.join('mockups', input.mockupId, 'versions', vid, 'build'),
      createdBy: input.createdBy,
      createdByType: input.createdByType,
    },
  });
  await prisma.mockup.update({
    where: { id: input.mockupId },
    data: { currentVersionId: vid },
  });
  return version;
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

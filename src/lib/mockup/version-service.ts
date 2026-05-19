import 'server-only';

import fs from 'node:fs';
import { env } from '@/lib/env';
import { versionDir } from '@/lib/mockup/storage';
import { prisma } from '@/lib/prisma';

interface ErrorWithStatus extends Error {
  status: number;
}

function http(status: number, message: string): never {
  const err = new Error(message) as ErrorWithStatus;
  err.status = status;
  throw err;
}

export async function promoteVersion(mockupId: string, vid: string) {
  const version = await prisma.mockupVersion.findUnique({ where: { id: vid } });
  if (!version || version.mockupId !== mockupId) http(404, 'version not found');
  await prisma.mockup.update({ where: { id: mockupId }, data: { currentVersionId: vid } });
}

export async function deleteVersion(mockupId: string, vid: string) {
  const mockup = await prisma.mockup.findUnique({ where: { id: mockupId } });
  if (!mockup) http(404, 'mockup not found');
  if (mockup && mockup.currentVersionId === vid) {
    http(409, 'cannot delete current version — promote another version first');
  }
  const version = await prisma.mockupVersion.findUnique({ where: { id: vid } });
  if (!version || version.mockupId !== mockupId) http(404, 'version not found');
  // DB first (cheap rollback if disk fails)
  await prisma.mockupVersion.delete({ where: { id: vid } });
  const dir = versionDir(env().DATA_DIR, mockupId, vid);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

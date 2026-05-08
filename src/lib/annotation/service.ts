import fs from 'node:fs';
import path from 'node:path';
import cuid from 'cuid';
import { type PinCoords, serializePinCoords } from '@/lib/annotation/pin-coords';
import { env } from '@/lib/env';
import { annotationDir } from '@/lib/mockup/storage';
import { prisma } from '@/lib/prisma';

interface CreateInput {
  mockupId: string;
  screenshotPng: Buffer;
  tldrawJson: unknown;
  message: string;
  authorId: string;
  authorType: 'user' | 'agent';
  pinCoords?: PinCoords | null;
}

export async function createAnnotation(input: CreateInput) {
  const aid = cuid();
  const dir = annotationDir(env().DATA_DIR, input.mockupId, aid);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'screenshot.png'), input.screenshotPng);
  fs.writeFileSync(path.join(dir, 'tldraw.json'), JSON.stringify(input.tldrawJson));
  const screenshotPath = path.posix.join(
    'mockups',
    input.mockupId,
    'annotations',
    aid,
    'screenshot.png',
  );
  const tldrawPath = path.posix.join('mockups', input.mockupId, 'annotations', aid, 'tldraw.json');
  return prisma.$transaction(async (tx) => {
    const annotation = await tx.annotation.create({
      data: {
        id: aid,
        mockupId: input.mockupId,
        screenshotPath,
        tldrawPath,
        createdBy: input.authorId,
        createdByType: input.authorType,
        pinCoords: input.pinCoords ? serializePinCoords(input.pinCoords) : null,
      },
    });
    const thread = await tx.thread.create({ data: { annotationId: aid, status: 'open' } });
    const message = await tx.message.create({
      data: {
        threadId: thread.id,
        authorType: input.authorType,
        authorId: input.authorId,
        body: input.message,
      },
    });
    return { annotation, thread, message };
  });
}

export async function listAnnotations(mockupId: string) {
  return prisma.annotation.findMany({
    where: { mockupId },
    orderBy: { createdAt: 'desc' },
    include: { thread: { include: { _count: { select: { messages: true } } } } },
  });
}

export async function getAnnotation(id: string) {
  return prisma.annotation.findUnique({
    where: { id },
    include: { thread: { include: { messages: { orderBy: { createdAt: 'asc' } } } } },
  });
}

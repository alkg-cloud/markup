import 'server-only';

import type { AnnotationStatus } from '@/lib/annotation/status';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const log = logger.child({ name: 'annotation-service' });

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

/** Anchor record persisted in `Annotation.anchors` (JSON array).
 *  Matches the pin anchoring strategy spec — text-anchor OR element-anchor. */
interface TextAnchorRecord {
  path: string;
  textOffset: number;
  subX?: number;
  subY?: number;
}
interface ElementAnchorRecord {
  path: string;
  offsetX: number;
  offsetY: number;
}
export type AnchorRecord = TextAnchorRecord | ElementAnchorRecord;

interface CreateCommentAnnotationInput {
  mockupId: string;
  body: string;
  anchors: AnchorRecord[];
  colorIndex: number;
  status?: AnnotationStatus;
  authorId: string;
  authorType: 'user' | 'agent';
  createdOnVersionId?: string | null;
}

/**
 * AppMain redesign: comment-only annotation creation flow.
 *
 * No screenshot — pins anchor to DOM elements inside the mockup. The legacy
 * `screenshotPath` column remains NOT NULL and is filled with an empty
 * marker for comment-only annotations.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §7
 * and `docs/superpowers/specs/2026-05-18-pin-anchoring-strategy.md`.
 */
export async function createCommentAnnotation(input: CreateCommentAnnotationInput) {
  let createdOnVersionId = input.createdOnVersionId ?? null;
  if (createdOnVersionId === null) {
    const mockup = await prisma.mockup.findUnique({
      where: { id: input.mockupId },
      select: { currentVersionId: true },
    });
    createdOnVersionId = mockup?.currentVersionId ?? null;
  }

  const result = await prisma.$transaction(async (tx) => {
    const annotation = await tx.annotation.create({
      data: {
        mockupId: input.mockupId,
        // Legacy column required NOT NULL — comment-only annotations
        // store an empty marker.
        screenshotPath: '',
        anchors: JSON.stringify(input.anchors),
        colorIndex: input.colorIndex,
        status: input.status ?? 'open',
        createdBy: input.authorId,
        createdByType: input.authorType,
        createdOnVersionId,
      },
    });
    const thread = await tx.thread.create({
      data: { annotationId: annotation.id, status: 'open' },
    });
    const message = await tx.message.create({
      data: {
        threadId: thread.id,
        authorType: input.authorType,
        authorId: input.authorId,
        body: input.body,
      },
    });
    return { annotation, thread, message };
  });
  log.info(
    {
      annotationId: result.annotation.id,
      mockupId: input.mockupId,
      authorType: input.authorType,
      kind: 'comment',
      anchorCount: input.anchors.length,
    },
    'annotation_created',
  );
  return result;
}

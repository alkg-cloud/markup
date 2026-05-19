import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import cuid from 'cuid';
import { type PinCoords, serializePinCoords } from '@/lib/annotation/pin-coords';
import type { AnnotationStatus } from '@/lib/annotation/status';
import { env } from '@/lib/env';
import { deleteIntentCache } from '@/lib/intent/cache';
import { annotationDir } from '@/lib/mockup/storage';
import { prisma } from '@/lib/prisma';
import { stripScreenshotBase64 } from '@/lib/tldraw/snapshot-screenshot';
import type { IntentType } from './intent';

export type { IntentType };

interface CreateInput {
  mockupId: string;
  screenshotPng: Buffer;
  tldrawJson: unknown;
  message: string;
  authorId: string;
  authorType: 'user' | 'agent';
  pinCoords?: PinCoords | null;
  intentType?: IntentType;
  createdOnVersionId?: string | null;
}

export async function createAnnotation(input: CreateInput) {
  const aid = cuid();
  const dir = annotationDir(env().DATA_DIR, input.mockupId, aid);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'screenshot.png'), input.screenshotPng);
  const strippedTldraw = stripScreenshotBase64(input.tldrawJson);
  fs.writeFileSync(path.join(dir, 'tldraw.json'), JSON.stringify(strippedTldraw));
  const screenshotPath = path.posix.join(
    'mockups',
    input.mockupId,
    'annotations',
    aid,
    'screenshot.png',
  );
  const tldrawPath = path.posix.join('mockups', input.mockupId, 'annotations', aid, 'tldraw.json');

  let createdOnVersionId = input.createdOnVersionId ?? null;
  if (createdOnVersionId === null) {
    const mockup = await prisma.mockup.findUnique({
      where: { id: input.mockupId },
      select: { currentVersionId: true },
    });
    createdOnVersionId = mockup?.currentVersionId ?? null;
  }

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
        intentType: input.intentType ?? 'other',
        createdOnVersionId,
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

export async function updateAnnotationTldraw(id: string, snapshot: unknown) {
  const annotation = await prisma.annotation.findUnique({ where: { id } });
  if (!annotation) return null;
  const abs = path.join(env().DATA_DIR, annotation.tldrawPath);
  const annDir = path.dirname(abs);
  // Invalidate intent sidecar BEFORE writing the new tldraw — readers that
  // see the new mtime should never get a stale intent.json with the old key.
  deleteIntentCache(annDir);
  const stripped = stripScreenshotBase64(snapshot);
  fs.writeFileSync(abs, JSON.stringify(stripped));
  return annotation;
}

/** Anchor record persisted in `Annotation.anchors` (JSON array).
 *  Matches the pin anchoring strategy spec — text-anchor OR element-anchor. */
export interface TextAnchorRecord {
  path: string;
  textOffset: number;
  subX?: number;
  subY?: number;
}
export interface ElementAnchorRecord {
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
 * No screenshot, no tldraw drawing — pins anchor to DOM elements inside
 * the mockup. The legacy `screenshotPath` and `tldrawPath` columns are
 * filled with empty strings (still NOT NULL until Phase 13 drops them).
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

  return prisma.$transaction(async (tx) => {
    const annotation = await tx.annotation.create({
      data: {
        mockupId: input.mockupId,
        // Legacy columns required NOT NULL — store empty markers until
        // Phase 13 drops them.
        screenshotPath: '',
        tldrawPath: '',
        anchors: JSON.stringify(input.anchors),
        colorIndex: input.colorIndex,
        status: input.status ?? 'open',
        createdBy: input.authorId,
        createdByType: input.authorType,
        // Comment-flow annotations are content-driven, not classified —
        // leave the intent at the default until/unless the user picks one
        // via the (future) chip selector. Per `docs/agent-loop/chips.md`
        // the value must stay inside INTENT_KINDS.
        intentType: 'other',
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
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { type IntentType, isIntentType } from '@/lib/annotation/intent';
import { parsePinCoords } from '@/lib/annotation/pin-coords';
import { ANNOTATION_STATUSES } from '@/lib/annotation/status';
import {
  type AnchorRecord,
  createAnnotation,
  createCommentAnnotation,
  listAnnotations,
} from '@/lib/annotation/service';
import { identify } from '@/lib/auth/identify';
import { prisma } from '@/lib/prisma';

// AppMain redesign: comment-only annotation payload. Detected by JSON
// content-type — the legacy drawing-based formData path remains below.
const TextAnchorSchema = z.object({
  path: z.string(),
  textOffset: z.number().int().nonnegative(),
  subX: z.number().optional(),
  subY: z.number().optional(),
});
const ElementAnchorSchema = z.object({
  path: z.string(),
  offsetX: z.number(),
  offsetY: z.number(),
});
const AnchorSchema = z.union([TextAnchorSchema, ElementAnchorSchema]);
const CommentPayloadSchema = z.object({
  body: z.string().min(1).max(10_000),
  anchors: z.array(AnchorSchema).max(20),
  colorIndex: z.number().int().min(0).max(15),
  status: z.enum(ANNOTATION_STATUSES).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await identify(req);
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id: mockupId } = await ctx.params;

  // Branch on content-type. JSON → comment annotation (no screenshot,
  // no tldraw). Multipart → legacy drawing-based annotation.
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => null);
    const parsed = CommentPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }
    // Verify mockup exists before writing so the caller gets a clean 404
    // instead of a Prisma FK constraint 500 (which leaks ORM details).
    const exists = await prisma.mockup.findUnique({
      where: { id: mockupId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: 'mockup_not_found' }, { status: 404 });
    }
    const result = await createCommentAnnotation({
      mockupId,
      body: parsed.data.body,
      anchors: parsed.data.anchors as AnchorRecord[],
      colorIndex: parsed.data.colorIndex,
      status: parsed.data.status,
      authorId: id.kind === 'user' ? id.userId : id.tokenId,
      authorType: id.kind,
    });
    return NextResponse.json(
      {
        id: result.annotation.id,
        threadId: result.thread.id,
        colorIndex: result.annotation.colorIndex,
        status: result.annotation.status,
        anchors: parsed.data.anchors,
      },
      { status: 201 },
    );
  }

  const fd = await req.formData();
  const screenshot = fd.get('screenshot');
  const tldrawRaw = fd.get('tldraw');
  const messageRaw = fd.get('message');
  if (
    !(screenshot instanceof Blob) ||
    typeof tldrawRaw !== 'string' ||
    typeof messageRaw !== 'string'
  ) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!messageRaw.trim()) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 });
  }
  let tldrawJson: unknown;
  try {
    tldrawJson = JSON.parse(tldrawRaw);
  } catch {
    return NextResponse.json({ error: 'invalid_tldraw_json' }, { status: 400 });
  }
  const pinCoordsRaw = fd.get('pinCoords');
  let pinCoords: ReturnType<typeof parsePinCoords> = null;
  if (typeof pinCoordsRaw === 'string') {
    pinCoords = parsePinCoords(pinCoordsRaw);
    if (!pinCoords) {
      return NextResponse.json({ error: 'invalid_pin_coords' }, { status: 400 });
    }
  }

  const intentRaw = fd.get('intent_type');
  let intentType: IntentType | undefined;
  if (typeof intentRaw === 'string' && intentRaw.length > 0) {
    if (!isIntentType(intentRaw)) {
      return NextResponse.json({ error: 'invalid_intent_type' }, { status: 400 });
    }
    intentType = intentRaw;
  }

  const buf = Buffer.from(await screenshot.arrayBuffer());
  const result = await createAnnotation({
    mockupId,
    screenshotPng: buf,
    tldrawJson,
    message: messageRaw,
    authorId: id.kind === 'user' ? id.userId : id.tokenId,
    authorType: id.kind,
    pinCoords,
    intentType,
  });
  return NextResponse.json(
    { id: result.annotation.id, threadId: result.thread.id },
    { status: 201 },
  );
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await identify(req);
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id: mockupId } = await ctx.params;
  const items = await listAnnotations(mockupId);
  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      createdByType: a.createdByType,
      threadStatus: a.thread?.status ?? 'open',
      messageCount: a.thread?._count.messages ?? 0,
    })),
  });
}

export const dynamic = 'force-dynamic';

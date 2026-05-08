import { NextResponse } from 'next/server';
import { parsePinCoords } from '@/lib/annotation/pin-coords';
import { createAnnotation, listAnnotations } from '@/lib/annotation/service';
import { identify } from '@/lib/auth/identify';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await identify(req);
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id: mockupId } = await ctx.params;
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
  const buf = Buffer.from(await screenshot.arrayBuffer());
  const result = await createAnnotation({
    mockupId,
    screenshotPng: buf,
    tldrawJson,
    message: messageRaw,
    authorId: id.kind === 'user' ? id.userId : id.tokenId,
    authorType: id.kind,
    pinCoords,
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

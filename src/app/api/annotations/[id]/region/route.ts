import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { parsePinCoords } from '@/lib/annotation/pin-coords';
import { identify } from '@/lib/auth/identify';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { cropRegion } from '@/lib/region/crop';

const PADDING = 20;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const annotation = await prisma.annotation.findUnique({ where: { id } });
  if (!annotation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!annotation.pinCoords) {
    return NextResponse.json({ error: 'no_pin_coords' }, { status: 404 });
  }
  const pin = parsePinCoords(annotation.pinCoords);
  if (!pin) return NextResponse.json({ error: 'invalid_pin_coords' }, { status: 500 });

  const screenshotAbs = path.join(env().DATA_DIR, annotation.screenshotPath);
  if (!fs.existsSync(screenshotAbs)) {
    return NextResponse.json({ error: 'screenshot_missing' }, { status: 404 });
  }
  const annDir = path.dirname(screenshotAbs);
  const sidecarPath = path.join(annDir, 'region.png');
  const screenshotMtime = fs.statSync(screenshotAbs).mtimeMs;
  const sidecarMtime = fs.existsSync(sidecarPath) ? fs.statSync(sidecarPath).mtimeMs : 0;

  let body: Buffer;
  if (sidecarMtime >= screenshotMtime && sidecarMtime > 0) {
    body = fs.readFileSync(sidecarPath);
  } else {
    const src = fs.readFileSync(screenshotAbs);
    body = await cropRegion(src, {
      x: pin.bboxX,
      y: pin.bboxY,
      w: pin.bboxW,
      h: pin.bboxH,
      padding: PADDING,
    });
    fs.writeFileSync(sidecarPath, body);
  }
  return new NextResponse(body as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=300',
    },
  });
}

export const dynamic = 'force-dynamic';

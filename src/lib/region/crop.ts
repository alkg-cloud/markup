import 'server-only';

import sharp from 'sharp';

interface CropInput {
  x: number;
  y: number;
  w: number;
  h: number;
  padding?: number;
}

export async function cropRegion(src: Buffer, input: CropInput): Promise<Buffer> {
  const padding = input.padding ?? 0;
  const meta = await sharp(src).metadata();
  const imgW = meta.width ?? 0;
  const imgH = meta.height ?? 0;
  const left = Math.max(0, Math.floor(input.x - padding));
  const top = Math.max(0, Math.floor(input.y - padding));
  const right = Math.min(imgW, Math.ceil(input.x + input.w + padding));
  const bottom = Math.min(imgH, Math.ceil(input.y + input.h + padding));
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  return sharp(src).extract({ left, top, width, height }).png().toBuffer();
}

import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { cropRegion } from '@/lib/region/crop';

async function makeRedSquarePng(w: number, h: number): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

describe('cropRegion', () => {
  it('crops the requested bbox with optional padding', async () => {
    const src = await makeRedSquarePng(200, 200);
    const out = await cropRegion(src, { x: 50, y: 50, w: 100, h: 100, padding: 10 });
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(120); // 100 + 10*2
    expect(meta.height).toBe(120);
  });

  it('clamps padding at left/top edges', async () => {
    const src = await makeRedSquarePng(200, 200);
    const out = await cropRegion(src, { x: 0, y: 0, w: 100, h: 100, padding: 50 });
    const meta = await sharp(out).metadata();
    // Left edge clamped to 0; right gets full padding. So width = 100 + 50 = 150.
    expect(meta.width).toBe(150);
    expect(meta.height).toBe(150);
  });

  it('returns the entire image when bbox + padding cover it', async () => {
    const src = await makeRedSquarePng(200, 200);
    const out = await cropRegion(src, { x: 0, y: 0, w: 200, h: 200, padding: 0 });
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(200);
  });

  it('handles bbox at right edge clamping to image width', async () => {
    const src = await makeRedSquarePng(200, 200);
    const out = await cropRegion(src, { x: 150, y: 50, w: 100, h: 100, padding: 0 });
    const meta = await sharp(out).metadata();
    // Right side clamped: x=150, w=100 -> should clamp to 200 width = 50px wide
    expect(meta.width).toBe(50);
    expect(meta.height).toBe(100);
  });
});

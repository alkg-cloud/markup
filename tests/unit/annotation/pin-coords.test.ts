import { describe, expect, it } from 'vitest';
import {
  computePinScreenPosition,
  type PinCoords,
  parsePinCoords,
  serializePinCoords,
} from '@/lib/annotation/pin-coords';

const sample: PinCoords = {
  scrollX: 0,
  scrollY: 100,
  viewportWidth: 1280,
  viewportHeight: 800,
  bboxX: 200,
  bboxY: 300,
  bboxW: 50,
  bboxH: 30,
};

describe('pin-coords', () => {
  it('round-trips JSON', () => {
    const s = serializePinCoords(sample);
    expect(typeof s).toBe('string');
    expect(parsePinCoords(s)).toEqual(sample);
  });

  it('parsePinCoords returns null for malformed JSON', () => {
    expect(parsePinCoords(null)).toBeNull();
    expect(parsePinCoords('')).toBeNull();
    expect(parsePinCoords('not-json')).toBeNull();
    expect(parsePinCoords('{"foo":1}')).toBeNull(); // missing required fields
  });

  it('computePinScreenPosition projects into iframe coords given current scroll', () => {
    const pos = computePinScreenPosition(sample, { scrollX: 0, scrollY: 80, tolerance: 50 });
    // bboxX-scrollX=200, bboxY-scrollY=220
    expect(pos).toEqual({ visible: true, x: 200, y: 220 });
  });

  it('computePinScreenPosition returns hidden when scroll is outside tolerance', () => {
    const pos = computePinScreenPosition(sample, { scrollX: 0, scrollY: 500, tolerance: 50 });
    expect(pos.visible).toBe(false);
  });

  it('tolerance defaults to 200px when omitted', () => {
    const pos = computePinScreenPosition(sample, { scrollX: 0, scrollY: 250 });
    expect(pos.visible).toBe(true);
  });
});

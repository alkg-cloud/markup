import { describe, expect, it } from 'vitest';
import { contrastRatio, parseRgb } from '@/lib/intent/contrast';

describe('parseRgb', () => {
  it('parses rgb()', () => expect(parseRgb('rgb(74, 58, 44)')).toEqual([74, 58, 44]));
  it('parses rgba()', () => expect(parseRgb('rgba(74, 58, 44, 0.5)')).toEqual([74, 58, 44]));
  it('parses #hex', () => expect(parseRgb('#4a3a2c')).toEqual([74, 58, 44]));
  it('parses bare hex (no #)', () => expect(parseRgb('4a3a2c')).toEqual([74, 58, 44]));
  it('returns null on bogus', () => expect(parseRgb('not a color')).toBeNull());
});

describe('contrastRatio', () => {
  it('white on black ≈ 21', () => {
    expect(contrastRatio('rgb(255,255,255)', 'rgb(0,0,0)')).toBeCloseTo(21, 0);
  });
  it('ink-2 on cream ≈ 9', () => {
    const r = contrastRatio('rgb(74,58,44)', 'rgb(243,237,228)');
    expect(r).toBeGreaterThan(8);
    expect(r).toBeLessThan(10);
  });
  it('ink on cream ≈ 14', () => {
    const r = contrastRatio('rgb(31,22,17)', 'rgb(243,237,228)');
    expect(r).toBeGreaterThan(13);
    expect(r).toBeLessThan(16);
  });
  it('returns 0 on unparseable inputs', () => {
    expect(contrastRatio('foo', 'rgb(0,0,0)')).toBe(0);
  });
});

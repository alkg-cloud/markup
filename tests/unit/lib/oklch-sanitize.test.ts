import { describe, expect, it } from 'vitest';
import { stripOklch } from '@/lib/oklch-sanitize';

function parseRgb(s: string): { r: number; g: number; b: number; a?: number } | null {
  const m = s.match(/rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : undefined };
}

describe('stripOklch', () => {
  it('replaces oklch() with a visible rgb fallback', () => {
    const result = stripOklch('oklch(74.4% 0.193 165)');
    expect(result).not.toContain('oklch');
    expect(result).toMatch(/rgb\(/);
    expect(result).not.toBe('rgba(0,0,0,0)');
  });

  it('converts accent teal oklch(74.4% 0.193 165) to a greenish rgb', () => {
    const c = parseRgb(stripOklch('oklch(74.4% 0.193 165)'));
    expect(c).toBeTruthy();
    expect(c!.g).toBeGreaterThan(c!.r);
    expect(c!.g).toBeGreaterThan(c!.b);
  });

  it('preserves lightness: dark oklch → dark rgb', () => {
    const c = parseRgb(stripOklch('oklch(11% 0.03 165)'));
    expect(c).toBeTruthy();
    expect(c!.r).toBeLessThan(30);
    expect(c!.g).toBeLessThan(40);
    expect(c!.b).toBeLessThan(30);
  });

  it('preserves lightness: bright oklch → light rgb', () => {
    const c = parseRgb(stripOklch('oklch(96% 0.02 165)'));
    expect(c).toBeTruthy();
    expect(c!.r).toBeGreaterThan(220);
    expect(c!.g).toBeGreaterThan(220);
    expect(c!.b).toBeGreaterThan(220);
  });

  it('handles oklch with alpha channel', () => {
    const result = stripOklch('oklch(74.4% 0.193 165 / 0.5)');
    expect(result).not.toContain('oklch');
    const c = parseRgb(result);
    expect(c).toBeTruthy();
    expect(c!.a).toBe(0.5);
  });

  it('handles oklch with 0-1 lightness (no %)', () => {
    const result = stripOklch('oklch(0.744 0.193 165)');
    expect(result).not.toContain('oklch');
    const c = parseRgb(result);
    expect(c).toBeTruthy();
    expect(c!.g).toBeGreaterThan(c!.r);
  });

  it('handles nested calc() inside oklch without leaving leftovers', () => {
    const input = 'color: oklch(0.5 calc(0.2 * 2) 180)';
    const result = stripOklch(input);
    expect(result).not.toContain('oklch');
    expect(result).not.toContain(' 180)');
    expect(result).toContain('color:');
    expect(result).toMatch(/^color: rgb\(\d+,\d+,\d+\)$/);
  });

  it('zero lightness produces black', () => {
    const result = stripOklch('oklch(0% 0 0 / 0.55)');
    expect(result).toBe('rgba(0,0,0,0.55)');
  });

  it('100% lightness produces white', () => {
    const result = stripOklch('oklch(100% 0 0 / 0.18)');
    expect(result).toBe('rgba(255,255,255,0.18)');
  });

  it('pure red hue produces reddish color', () => {
    const c = parseRgb(stripOklch('oklch(63% 0.26 29)'));
    expect(c).toBeTruthy();
    expect(c!.r).toBeGreaterThan(c!.g);
    expect(c!.r).toBeGreaterThan(c!.b);
  });

  it('pure blue hue produces bluish color', () => {
    const c = parseRgb(stripOklch('oklch(45% 0.31 264)'));
    expect(c).toBeTruthy();
    expect(c!.b).toBeGreaterThan(c!.r);
    expect(c!.b).toBeGreaterThan(c!.g);
  });

  it('replaces multiple oklch occurrences in a single value', () => {
    const input = '0 4px 12px oklch(0% 0 0 / 0.55), inset 0 1px 0 oklch(100% 0 0 / 0.18)';
    const result = stripOklch(input);
    expect(result).not.toContain('oklch');
    expect(result.match(/rgba?\(/g)?.length).toBe(2);
  });

  it('leaves non-oklch values unchanged', () => {
    expect(stripOklch('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
    expect(stripOklch('#ff0000')).toBe('#ff0000');
    expect(stripOklch('transparent')).toBe('transparent');
  });

  it('handles oklch inside linear-gradient with alpha stops', () => {
    const input =
      'linear-gradient(135deg, oklch(20% 0.025 322 / 0.85) 7%, oklch(15% 0.02 322 / 0.95) 98%)';
    const result = stripOklch(input);
    expect(result).not.toContain('oklch');
    expect(result).toContain('linear-gradient');
    expect(result).toContain('rgba(');
  });

  it('returns empty string unchanged', () => {
    expect(stripOklch('')).toBe('');
  });
});

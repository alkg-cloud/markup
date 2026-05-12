import { describe, expect, it } from 'vitest';
import { stripOklch } from '@/lib/oklch-sanitize';

describe('stripOklch', () => {
  it('replaces oklch() with rgba(0,0,0,0) fallback', () => {
    const result = stripOklch('oklch(74.4% 0.193 165)');
    expect(result).not.toContain('oklch');
    expect(result).toMatch(/rgba?\(/);
  });

  it('handles oklch with alpha channel', () => {
    const result = stripOklch('oklch(74.4% 0.193 165 / 0.5)');
    expect(result).not.toContain('oklch');
    expect(result).toMatch(/rgba?\(/);
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

  it('handles oklch inside linear-gradient', () => {
    const input =
      'linear-gradient(135deg, oklch(20% 0.025 322 / 0.85) 7%, oklch(15% 0.02 322 / 0.95) 98%)';
    const result = stripOklch(input);
    expect(result).not.toContain('oklch');
    expect(result).toContain('linear-gradient');
  });

  it('returns empty string unchanged', () => {
    expect(stripOklch('')).toBe('');
  });
});

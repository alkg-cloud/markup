import { describe, expect, it } from 'vitest';
import { buildMockupCSP } from '@/lib/csp';

describe('buildMockupCSP', () => {
  it('allows self + inline script/style for mockups', () => {
    const csp = buildMockupCSP();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it('allows Google Fonts in style-src and font-src', () => {
    const csp = buildMockupCSP();
    expect(csp).toContain('https://fonts.googleapis.com');
    expect(csp).toContain('https://fonts.gstatic.com');
    const styleSrc = csp.split(';').find((d) => d.trim().startsWith('style-src'));
    expect(styleSrc).toContain('https://fonts.googleapis.com');
    const fontSrc = csp.split(';').find((d) => d.trim().startsWith('font-src'));
    expect(fontSrc).toContain('https://fonts.gstatic.com');
  });
});

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
});

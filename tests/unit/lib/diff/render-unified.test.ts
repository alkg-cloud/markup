import { describe, expect, it } from 'vitest';
import { renderUnifiedDiff } from '@/lib/diff/render-unified';

describe('renderUnifiedDiff', () => {
  it('returns empty string when contents identical', () => {
    expect(renderUnifiedDiff('a', 'index.html', 'a', 'index.html')).toBe('');
  });

  it('produces a unified diff with file labels', () => {
    const out = renderUnifiedDiff('a\nb\n', 'index.html (v1)', 'a\nB\n', 'index.html (v2)');
    expect(out).toMatch(/^---/);
    expect(out).toMatch(/\+\+\+/);
    expect(out).toMatch(/^-b$/m);
    expect(out).toMatch(/^\+B$/m);
  });
});

import { describe, expect, it } from 'vitest';
import { DiffApplyError, applyUnifiedDiff } from '@/lib/diff/apply-unified';

const ORIG = 'line a\nline b\nline c\n';

describe('applyUnifiedDiff', () => {
  it('applies a clean hunk', () => {
    const patch = `--- a/x\n+++ b/x\n@@ -1,3 +1,3 @@\n line a\n-line b\n+line B\n line c\n`;
    expect(applyUnifiedDiff(ORIG, patch)).toBe('line a\nline B\nline c\n');
  });

  it('throws DiffApplyError(conflict) when context does not match', () => {
    const patch = `--- a/x\n+++ b/x\n@@ -1,3 +1,3 @@\n line a\n-WRONG\n+line B\n line c\n`;
    expect(() => applyUnifiedDiff(ORIG, patch)).toThrow(DiffApplyError);
    try {
      applyUnifiedDiff(ORIG, patch);
    } catch (e) {
      expect((e as DiffApplyError).reason).toBe('conflict');
    }
  });

  it('throws on empty patch', () => {
    expect(() => applyUnifiedDiff(ORIG, '')).toThrow(DiffApplyError);
  });

  it('returns source unchanged when patch contains no recognizable hunks', () => {
    // The `diff` library treats unstructured text as a no-op patch; we don't
    // try to second-guess that. The route layer relies on hunks-must-apply
    // semantics enforced by the library's conflict detection.
    expect(applyUnifiedDiff(ORIG, 'not a diff')).toBe(ORIG);
  });
});

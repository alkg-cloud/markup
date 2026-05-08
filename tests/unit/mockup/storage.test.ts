import { describe, expect, it } from 'vitest';
import {
  annotationDir,
  mockupDir,
  resolveServePath,
  thumbnailPath,
  versionBuildDir,
  versionSourceZipPath,
} from '@/lib/mockup/storage';

describe('storage helpers', () => {
  it('builds canonical paths', () => {
    expect(mockupDir('/data', 'm1')).toBe('/data/mockups/m1');
    expect(versionBuildDir('/data', 'm1', 'v1')).toBe('/data/mockups/m1/versions/v1/build');
    expect(versionSourceZipPath('/data', 'm1', 'v1')).toBe(
      '/data/mockups/m1/versions/v1/source.zip',
    );
    expect(annotationDir('/data', 'm1', 'a1')).toBe('/data/mockups/m1/annotations/a1');
    expect(thumbnailPath('/data', 'm1')).toBe('/data/mockups/m1/thumbnail.png');
  });

  it('resolveServePath defends against traversal', () => {
    const root = '/data/mockups/m1/versions/v1/build';
    const ok = resolveServePath(root, ['index.html']);
    expect(ok.endsWith('/index.html')).toBe(true);
    expect(() => resolveServePath(root, ['..', 'etc', 'passwd'])).toThrow();
    expect(() => resolveServePath(root, ['/etc/passwd'])).toThrow();
  });
});

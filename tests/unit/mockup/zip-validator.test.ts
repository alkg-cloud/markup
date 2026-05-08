import { describe, expect, it } from 'vitest';
import { ALLOWED_EXTENSIONS, validateEntries, type ZipEntry } from '@/lib/mockup/zip-validator';

const baseLimits = {
  maxTotalBytes: 50 * 1024 * 1024,
  maxFiles: 1000,
  maxFileBytes: 10 * 1024 * 1024,
};
const e = (path: string, size = 100, attr: Partial<ZipEntry> = {}): ZipEntry => ({
  path,
  uncompressedSize: size,
  isSymlink: false,
  ...attr,
});

describe('validateEntries', () => {
  it('accepts a happy zip', () => {
    expect(() => validateEntries([e('index.html'), e('app.js')], baseLimits)).not.toThrow();
  });
  it('requires index.html at root', () => {
    expect(() => validateEntries([e('subdir/index.html')], baseLimits)).toThrow(/index\.html/);
  });
  it('rejects zipslip', () => {
    expect(() => validateEntries([e('index.html'), e('../escape.txt')], baseLimits)).toThrow(
      /path/i,
    );
  });
  it('rejects absolute paths', () => {
    expect(() => validateEntries([e('index.html'), e('/etc/passwd')], baseLimits)).toThrow();
  });
  it('rejects symlinks', () => {
    expect(() =>
      validateEntries([e('index.html'), e('link', 0, { isSymlink: true })], baseLimits),
    ).toThrow(/symlink/i);
  });
  it('rejects file count overflow', () => {
    const many = Array.from({ length: 1001 }, (_, i) => e(`f${i}.html`));
    expect(() => validateEntries([e('index.html'), ...many], baseLimits)).toThrow(/too many/i);
  });
  it('rejects total size overflow', () => {
    expect(() => validateEntries([e('index.html', 60 * 1024 * 1024)], baseLimits)).toThrow(
      /file size|total/i,
    );
  });
  it('rejects disallowed extension', () => {
    expect(() => validateEntries([e('index.html'), e('binary.exe')], baseLimits)).toThrow(
      /extension/i,
    );
  });
  it('exposes allowed extensions list', () => {
    expect(ALLOWED_EXTENSIONS).toContain('.html');
    expect(ALLOWED_EXTENSIONS).toContain('.svg');
    expect(ALLOWED_EXTENSIONS).not.toContain('.exe');
  });
});

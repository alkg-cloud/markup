import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractZip } from '@/lib/mockup/zip-extractor';

const fixture = (name: string) => path.resolve('tests/fixtures/mockups', name);

const limits = {
  maxTotalBytes: 50 * 1024 * 1024,
  maxFiles: 1000,
  maxFileBytes: 10 * 1024 * 1024,
};

describe('extractZip', () => {
  it('extracts to a destination dir', async () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-extract-'));
    const result = await extractZip(fixture('valid-simple.zip'), dest, limits);
    expect(result.fileCount).toBe(2);
    expect(fs.readFileSync(path.join(dest, 'index.html'), 'utf8')).toContain('hi');
    expect(fs.readFileSync(path.join(dest, 'app.js'), 'utf8')).toContain('console.log');
    fs.rmSync(dest, { recursive: true, force: true });
  });

  it('returns thumbnail buffer when thumbnail.png is at root', async () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-extract-'));
    const result = await extractZip(fixture('with-thumbnail.zip'), dest, limits);
    expect(result.thumbnail).toBeInstanceOf(Buffer);
    fs.rmSync(dest, { recursive: true, force: true });
  });
});

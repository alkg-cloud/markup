import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES } from '@/lib/upload/constants';
import { validateFile } from '@/lib/upload/validate-file';

// Build a FileList-like object backed by a real File[] for tests.
// jsdom-less node env doesn't expose FileList; the helper accepts
// FileList | File[], so we exercise both shapes.
function makeFileList(files: File[]): FileList {
  const list = {
    length: files.length,
    item(index: number) {
      return files[index] ?? null;
    },
    [Symbol.iterator]: function* () {
      for (const f of files) yield f;
    },
  } as unknown as FileList;
  for (let i = 0; i < files.length; i += 1) {
    (list as unknown as Record<number, File>)[i] = files[i];
  }
  return list;
}

function htmlFile(name = 'index.html', type = 'text/html', size = 1024): File {
  const padding = size > 0 ? 'x'.repeat(size) : '';
  return new File([padding], name, { type });
}

function zipFile(name = 'bundle.zip', type = 'application/zip', size = 1024): File {
  const padding = size > 0 ? 'x'.repeat(size) : '';
  return new File([padding], name, { type });
}

function pngFile(): File {
  return new File(['png-bytes'], 'image.png', { type: 'image/png' });
}

function pdfFile(): File {
  return new File(['pdf-bytes'], 'doc.pdf', { type: 'application/pdf' });
}

describe('validateFile', () => {
  it('rejects when 0 files (FileList)', () => {
    expect(validateFile(makeFileList([]))).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects when 0 files (File[])', () => {
    expect(validateFile([])).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects when more than one file', () => {
    expect(validateFile(makeFileList([htmlFile(), htmlFile('other.html')]))).toEqual({
      ok: false,
      reason: 'multi',
    });
  });

  it('rejects .png file as wrong-type', () => {
    expect(validateFile(makeFileList([pngFile()]))).toEqual({ ok: false, reason: 'wrong-type' });
  });

  it('rejects .pdf file as wrong-type', () => {
    expect(validateFile(makeFileList([pdfFile()]))).toEqual({ ok: false, reason: 'wrong-type' });
  });

  it('rejects .html file larger than 10 MB as too-large', () => {
    const oversize = htmlFile('big.html', 'text/html', MAX_UPLOAD_BYTES + 1);
    expect(validateFile(makeFileList([oversize]))).toEqual({ ok: false, reason: 'too-large' });
  });

  it('accepts .html file at or under 10 MB', () => {
    const file = htmlFile();
    const result = validateFile(makeFileList([file]));
    expect(result).toEqual({ ok: true, file });
  });

  it('accepts .zip file at or under 10 MB', () => {
    const file = zipFile();
    const result = validateFile(makeFileList([file]));
    expect(result).toEqual({ ok: true, file });
  });

  it('accepts .HTML (uppercase extension) regardless of MIME', () => {
    const file = new File(['x'], 'INDEX.HTML', { type: 'application/octet-stream' });
    const result = validateFile(makeFileList([file]));
    expect(result).toEqual({ ok: true, file });
  });

  it('accepts file with no recognizable extension if MIME is text/html', () => {
    const file = new File(['x'], 'noext', { type: 'text/html' });
    const result = validateFile(makeFileList([file]));
    expect(result).toEqual({ ok: true, file });
  });

  it('rejection precedence: empty beats multi/wrong-type/too-large', () => {
    expect(validateFile(makeFileList([]))).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejection precedence: multi beats wrong-type/too-large', () => {
    const big = htmlFile('big.html', 'text/html', MAX_UPLOAD_BYTES + 1);
    expect(validateFile(makeFileList([pngFile(), big]))).toEqual({ ok: false, reason: 'multi' });
  });

  it('rejection precedence: wrong-type beats too-large', () => {
    const oversizePng = new File(['x'.repeat(MAX_UPLOAD_BYTES + 1)], 'big.png', {
      type: 'image/png',
    });
    expect(validateFile(makeFileList([oversizePng]))).toEqual({
      ok: false,
      reason: 'wrong-type',
    });
  });
});

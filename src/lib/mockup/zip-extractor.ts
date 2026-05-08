import fs from 'node:fs';
import path from 'node:path';
import yauzl from 'yauzl';
import { type ValidationLimits, validateEntries, type ZipEntry } from './zip-validator';

export interface ExtractResult {
  fileCount: number;
  totalBytes: number;
  thumbnail?: Buffer;
}

function listEntries(zipPath: string): Promise<ZipEntry[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err ?? new Error('zip open failed'));
      const entries: ZipEntry[] = [];
      zipfile.on('entry', (entry) => {
        const externalAttrs = (entry.externalFileAttributes >>> 16) & 0xffff;
        const isSymlink = (externalAttrs & 0xa000) === 0xa000;
        entries.push({
          path: entry.fileName,
          uncompressedSize: entry.uncompressedSize,
          isSymlink,
        });
        zipfile.readEntry();
      });
      zipfile.on('end', () => resolve(entries));
      zipfile.on('error', reject);
      zipfile.readEntry();
    });
  });
}

function readEntryBuffer(zipfile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, rs) => {
      if (err || !rs) return reject(err ?? new Error('open stream failed'));
      const chunks: Buffer[] = [];
      rs.on('data', (c) => chunks.push(c));
      rs.on('end', () => resolve(Buffer.concat(chunks)));
      rs.on('error', reject);
    });
  });
}

export async function extractZip(
  zipPath: string,
  destDir: string,
  limits: ValidationLimits,
): Promise<ExtractResult> {
  const entries = await listEntries(zipPath);
  validateEntries(entries, limits);

  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err ?? new Error('zip reopen failed'));
      let totalBytes = 0;
      let thumbnail: Buffer | undefined;
      const root = path.resolve(destDir);

      zipfile.on('entry', async (entry) => {
        try {
          if (entry.fileName.endsWith('/')) return zipfile.readEntry();
          const externalAttrs = (entry.externalFileAttributes >>> 16) & 0xffff;
          const isSymlink = (externalAttrs & 0xa000) === 0xa000;
          if (isSymlink) return zipfile.readEntry();

          const target = path.resolve(destDir, entry.fileName);
          if (!(target === root || target.startsWith(root + path.sep))) {
            zipfile.close();
            return reject(new Error('extraction path escape'));
          }
          fs.mkdirSync(path.dirname(target), { recursive: true });
          const buf = await readEntryBuffer(zipfile, entry);
          fs.writeFileSync(target, buf);
          totalBytes += buf.length;
          if (entry.fileName === 'thumbnail.png') thumbnail = buf;
          zipfile.readEntry();
        } catch (e) {
          zipfile.close();
          reject(e);
        }
      });
      zipfile.on('end', () => {
        resolve({ fileCount: entries.length, totalBytes, thumbnail });
      });
      zipfile.on('error', reject);
      zipfile.readEntry();
    });
  });
}

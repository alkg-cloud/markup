import path from 'node:path';

export const ALLOWED_EXTENSIONS = [
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.webp',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.txt',
  '.map',
  '.md',
] as const;

export interface ZipEntry {
  path: string;
  uncompressedSize: number;
  isSymlink: boolean;
}

export interface ValidationLimits {
  maxTotalBytes: number;
  maxFiles: number;
  maxFileBytes: number;
}

export function validateEntries(entries: ZipEntry[], limits: ValidationLimits): void {
  if (entries.length > limits.maxFiles) {
    throw new Error(`zip has too many files (${entries.length} > ${limits.maxFiles})`);
  }
  let total = 0;
  let hasIndex = false;
  for (const entry of entries) {
    if (entry.isSymlink) throw new Error(`zip entry "${entry.path}" is a symlink`);
    if (path.isAbsolute(entry.path) || entry.path.startsWith('/')) {
      throw new Error(`zip entry "${entry.path}" has absolute path`);
    }
    const normalized = path.posix.normalize(entry.path);
    if (normalized.startsWith('..') || normalized.includes('/../') || normalized === '..') {
      throw new Error(`zip entry "${entry.path}" path escapes root`);
    }
    if (entry.path.includes('\0')) throw new Error('null byte in path');
    const ext = path.extname(entry.path).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
      throw new Error(`zip entry "${entry.path}" has disallowed extension "${ext}"`);
    }
    if (entry.uncompressedSize > limits.maxFileBytes) {
      throw new Error(`zip entry "${entry.path}" exceeds per-file size limit`);
    }
    total += entry.uncompressedSize;
    if (total > limits.maxTotalBytes) throw new Error('zip total size exceeds limit');
    if (entry.path === 'index.html') hasIndex = true;
  }
  if (!hasIndex) throw new Error('zip is missing index.html at root');
}

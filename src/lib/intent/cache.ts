import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

const FILE = 'intent.json';

interface Wrapped<T> {
  key: string;
  payload: T;
}

export function intentSidecarPath(annDir: string): string {
  return path.join(annDir, FILE);
}

export function readIntentCache<T>(annDir: string, key: string): Wrapped<T> | null {
  const p = intentSidecarPath(annDir);
  if (!fs.existsSync(p)) return null;
  try {
    const wrapped = JSON.parse(fs.readFileSync(p, 'utf8')) as Wrapped<T>;
    if (wrapped.key !== key) return null;
    return wrapped;
  } catch {
    return null;
  }
}

export function writeIntentCache<T>(annDir: string, key: string, payload: T): void {
  fs.writeFileSync(intentSidecarPath(annDir), JSON.stringify({ key, payload }));
}

export function deleteIntentCache(annDir: string): void {
  const p = intentSidecarPath(annDir);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

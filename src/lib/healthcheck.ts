import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface FsProbeOptions {
  dir: string;
  windowMs?: number;
  now?: () => number;
  check?: (dir: string) => Promise<boolean>;
}

async function defaultCheck(dir: string): Promise<boolean> {
  const probePath = path.join(dir, `.health-${randomUUID()}`);
  await fs.writeFile(probePath, 'ok');
  await fs.unlink(probePath);
  return true;
}

export function createFsProbe(opts: FsProbeOptions) {
  const windowMs = opts.windowMs ?? 60_000;
  const now = opts.now ?? Date.now;
  const check = opts.check ?? defaultCheck;
  let lastResult: boolean | null = null;
  let lastAt = -Infinity;
  return async function probe(): Promise<boolean> {
    if (lastResult !== null && now() - lastAt < windowMs) return lastResult;
    try {
      lastResult = await check(opts.dir);
    } catch {
      lastResult = false;
    }
    lastAt = now();
    return lastResult;
  };
}

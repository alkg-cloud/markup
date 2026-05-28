// scripts/cleanup-tldraw-sidecars.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data');

async function walkAndUnlink(dir: string): Promise<number> {
  let removed = 0;
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removed += await walkAndUnlink(full);
    } else if (entry.isFile() && entry.name === 'tldraw.json') {
      await fs.unlink(full);
      removed += 1;
    }
  }
  return removed;
}

async function main() {
  const annotationsRoot = path.join(DATA_DIR, 'mockups');
  const removed = await walkAndUnlink(annotationsRoot);
  console.log(`[cleanup-tldraw-sidecars] removed ${removed} tldraw.json files under ${annotationsRoot}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

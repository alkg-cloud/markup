import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FORBIDDEN = [
  /from\s+['"](@prisma\/client|prisma|\.\.\/lib\/db|\.\.\/\.\.\/lib\/db|@\/lib\/db)['"]/,
  /from\s+['"]jose['"]/,
  /from\s+['"]puppeteer['"]/,
  /from\s+['"]pino['"]/,
  /from\s+['"]server-only['"]/,
  /from\s+['"]next\/headers['"]/,
  /from\s+['"]next\/server['"]/,
];

const ROOTS = ['src/app/landing', 'src/components/landing'];

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  // Cast to Dirent<string>[]: passing `encoding: 'utf8'` guarantees string
  // names at runtime, but @types/node 24's overload still infers the buffer
  // variant. The cast keeps `e.name` typed as the string we know it is.
  let entries: Dirent<string>[];
  try {
    entries = (await readdir(dir, { withFileTypes: true, encoding: 'utf8' })) as Dirent<string>[];
  } catch {
    return out; // directory doesn't exist yet — fine on first run
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('landing purity', () => {
  it('no landing-reachable file imports server-only modules', async () => {
    const files = (await Promise.all(ROOTS.map(walk))).flat();
    const offenders: string[] = [];
    for (const f of files) {
      const src = await readFile(f, 'utf8');
      for (const pat of FORBIDDEN) {
        if (pat.test(src)) offenders.push(`${f} :: ${pat}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

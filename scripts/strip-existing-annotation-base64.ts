import fs from 'node:fs';
import path from 'node:path';
import { env } from '../src/lib/env';
import { stripScreenshotBase64 } from '../src/lib/tldraw/snapshot-screenshot';

function main() {
  const root = path.join(env().DATA_DIR, 'mockups');
  if (!fs.existsSync(root)) {
    console.log(`no data dir at ${root}`);
    return;
  }
  let touched = 0;
  let savedBytes = 0;
  for (const mid of fs.readdirSync(root)) {
    const annRoot = path.join(root, mid, 'annotations');
    if (!fs.existsSync(annRoot)) continue;
    for (const aid of fs.readdirSync(annRoot)) {
      const tldrawPath = path.join(annRoot, aid, 'tldraw.json');
      if (!fs.existsSync(tldrawPath)) continue;
      const before = fs.statSync(tldrawPath).size;
      let raw: unknown;
      try {
        raw = JSON.parse(fs.readFileSync(tldrawPath, 'utf8'));
      } catch (e) {
        console.log(`SKIP ${mid.slice(0, 8)}/${aid.slice(0, 8)}: invalid JSON`);
        continue;
      }
      const stripped = stripScreenshotBase64(raw);
      fs.writeFileSync(tldrawPath, JSON.stringify(stripped));
      const after = fs.statSync(tldrawPath).size;
      console.log(
        `${mid.slice(0, 8)}/${aid.slice(0, 8)}: ${before} -> ${after} (-${before - after} bytes)`,
      );
      touched++;
      savedBytes += before - after;
    }
  }
  console.log(
    `\nscanned ${touched} annotation files, reclaimed ${(savedBytes / 1024).toFixed(1)} KB`,
  );
}

main();

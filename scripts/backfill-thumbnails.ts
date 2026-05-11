import fs from 'node:fs';
import path from 'node:path';
import { env } from '@/lib/env';
import { generateThumbnailFromBuildDir } from '@/lib/mockup/thumbnail-generator';
import { prisma } from '@/lib/prisma';

async function main() {
  const root = env().DATA_DIR;

  const mockups = await prisma.mockup.findMany({
    include: { versions: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const mockup of mockups) {
    const tp = path.join(root, 'mockups', mockup.id, 'thumbnail.png');
    if (fs.existsSync(tp)) {
      skipped++;
      continue;
    }

    const version = mockup.versions[0];
    if (!version) {
      console.warn(`[skip] ${mockup.id}: no versions`);
      skipped++;
      continue;
    }

    const buildDir = path.join(root, version.path);
    const buf = await generateThumbnailFromBuildDir(buildDir);
    if (buf) {
      fs.mkdirSync(path.dirname(tp), { recursive: true });
      fs.writeFileSync(tp, buf);
      console.log(`[ok] ${mockup.id} (${mockup.name})`);
      generated++;
    } else {
      console.warn(`[fail] ${mockup.id} (${mockup.name}): no index.html or puppeteer unavailable`);
      failed++;
    }
  }

  console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

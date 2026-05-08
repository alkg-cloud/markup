import fs from 'node:fs';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

async function main() {
  const stat = fs.statSync(env().DATA_DIR);
  if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) {
    console.error(`refusing: data dir owner UID ${stat.uid} != process UID ${process.getuid()}`);
    process.exit(2);
  }
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.config.deleteMany({ where: { key: 'setup_completed' } });
  console.log('reset:auth complete; setup wizard will appear on next request');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

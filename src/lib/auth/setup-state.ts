import 'server-only';

import { prisma } from '@/lib/prisma';

export async function isSetupCompleted(): Promise<boolean> {
  const row = await prisma.config.findUnique({ where: { key: 'setup_completed' } });
  return row?.value === 'true';
}

export async function markSetupCompleted(): Promise<void> {
  await prisma.config.upsert({
    where: { key: 'setup_completed' },
    create: { key: 'setup_completed', value: 'true' },
    update: { value: 'true' },
  });
}

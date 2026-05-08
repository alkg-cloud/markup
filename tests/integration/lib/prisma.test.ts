import { describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('prisma client', () => {
  it('connects in WAL journal mode', async () => {
    const rows = await prisma.$queryRaw<Array<{ journal_mode: string }>>`PRAGMA journal_mode`;
    expect(rows[0].journal_mode.toLowerCase()).toBe('wal');
  });
});

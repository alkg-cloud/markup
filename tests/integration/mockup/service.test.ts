import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { addVersion, createMockupFromZip, getMockup, listMockups } from '@/lib/mockup/service';
import { prisma } from '@/lib/prisma';

const fixture = (n: string) => path.resolve('tests/fixtures/mockups', n);

describe('mockup service', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('creates a mockup with one version from a valid zip', async () => {
    const result = await createMockupFromZip({
      name: 'Landing',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u1',
      createdByType: 'user',
    });
    expect(result.mockup.name).toBe('Landing');
    expect(result.mockup.currentVersionId).toBe(result.version.id);
    const buildDir = path.join(
      process.env.DATA_DIR ?? '',
      'mockups',
      result.mockup.id,
      'versions',
      result.version.id,
      'build',
    );
    expect(fs.existsSync(path.join(buildDir, 'index.html'))).toBe(true);
  });

  it('persists thumbnail when zip contains thumbnail.png', async () => {
    const result = await createMockupFromZip({
      name: 'WithThumb',
      zipPath: fixture('with-thumbnail.zip'),
      createdBy: 'u1',
      createdByType: 'user',
    });
    const tp = path.join(process.env.DATA_DIR ?? '', 'mockups', result.mockup.id, 'thumbnail.png');
    expect(fs.existsSync(tp)).toBe(true);
  });

  it('addVersion creates a second version and updates currentVersionId', async () => {
    const r1 = await createMockupFromZip({
      name: 'X',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const r2 = await addVersion({
      mockupId: r1.mockup.id,
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const reloaded = await getMockup(r1.mockup.id);
    expect(reloaded?.currentVersionId).toBe(r2.id);
    expect(reloaded?.versions.length).toBe(2);
  });

  it('lists mockups filtered by status', async () => {
    await createMockupFromZip({
      name: 'a',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const m = await createMockupFromZip({
      name: 'b',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    await prisma.mockup.update({ where: { id: m.mockup.id }, data: { status: 'archived' } });
    const open = await listMockups({ status: ['open', 'resolved'] });
    expect(open.items.length).toBe(1);
    const all = await listMockups({ status: ['open', 'resolved', 'archived'] });
    expect(all.items.length).toBe(2);
  });
});

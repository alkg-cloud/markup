import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from '@/lib/env';
import { addVersion, createMockupFromZip } from '@/lib/mockup/service';
import { versionDir } from '@/lib/mockup/storage';
import { deleteVersion, promoteVersion } from '@/lib/mockup/version-service';
import { prisma } from '@/lib/prisma';

const fixture = (n: string) => path.resolve('tests/fixtures/mockups', n);

describe('version-service', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('promoteVersion sets currentVersionId', async () => {
    const m = await createMockupFromZip({
      name: 'M',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
      versionCreatedBy: 'u',
      versionCreatedByType: 'user',
    });
    const v2 = await addVersion({
      mockupId: m.mockup.id,
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    // After addVersion the new version is automatically current; promote v1 back.
    await promoteVersion(m.mockup.id, m.version.id);
    const reloaded = await prisma.mockup.findUnique({ where: { id: m.mockup.id } });
    expect(reloaded?.currentVersionId).toBe(m.version.id);
    expect(v2.id).not.toBe(m.version.id); // sanity
  });

  it('deleteVersion removes a non-current version row + its directory', async () => {
    const m = await createMockupFromZip({
      name: 'M',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
      versionCreatedBy: 'u',
      versionCreatedByType: 'user',
    });
    const v2 = await addVersion({
      mockupId: m.mockup.id,
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const v1Dir = versionDir(env().DATA_DIR, m.mockup.id, m.version.id);
    expect(fs.existsSync(v1Dir)).toBe(true);
    await deleteVersion(m.mockup.id, m.version.id);
    expect(await prisma.mockupVersion.findUnique({ where: { id: m.version.id } })).toBeNull();
    expect(fs.existsSync(v1Dir)).toBe(false);
    // v2 (current) untouched
    expect(await prisma.mockupVersion.findUnique({ where: { id: v2.id } })).not.toBeNull();
  });

  it('deleteVersion refuses the current version', async () => {
    const m = await createMockupFromZip({
      name: 'M',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
      versionCreatedBy: 'u',
      versionCreatedByType: 'user',
    });
    await expect(deleteVersion(m.mockup.id, m.version.id)).rejects.toThrow(/current/i);
  });

  it('deleteVersion 404s an unknown vid', async () => {
    const m = await createMockupFromZip({
      name: 'M',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
      versionCreatedBy: 'u',
      versionCreatedByType: 'user',
    });
    await expect(deleteVersion(m.mockup.id, 'unknown')).rejects.toThrow(/not.?found/i);
  });

  it('annotations are NOT cascaded by version deletion', async () => {
    const m = await createMockupFromZip({
      name: 'M',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
      versionCreatedBy: 'u',
      versionCreatedByType: 'user',
    });
    await addVersion({
      mockupId: m.mockup.id,
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    await prisma.annotation.create({
      data: {
        id: 'a1',
        mockupId: m.mockup.id,
        screenshotPath: 'x',
        tldrawPath: 'y',
        createdBy: 'u',
        createdByType: 'user',
      },
    });
    await deleteVersion(m.mockup.id, m.version.id);
    expect(await prisma.annotation.count()).toBe(1);
  });
});

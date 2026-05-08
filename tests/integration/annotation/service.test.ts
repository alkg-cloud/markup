import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createAnnotation, getAnnotation, listAnnotations } from '@/lib/annotation/service';
import { createMockupFromZip } from '@/lib/mockup/service';
import { prisma } from '@/lib/prisma';

const fixture = (n: string) => path.resolve('tests/fixtures/mockups', n);

describe('annotation service', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('creates annotation + thread + initial message in one transaction', async () => {
    const m = await createMockupFromZip({
      name: 'X',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const result = await createAnnotation({
      mockupId: m.mockup.id,
      screenshotPng: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      tldrawJson: { schema: 'placeholder' },
      message: 'Navbar too large',
      authorId: 'user1',
      authorType: 'user',
    });
    expect(result.annotation.id).toBeDefined();
    expect(result.thread.status).toBe('open');
    expect(result.message.body).toBe('Navbar too large');
  });

  it('listAnnotations returns annotations with thread state and message count', async () => {
    const m = await createMockupFromZip({
      name: 'Y',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    await createAnnotation({
      mockupId: m.mockup.id,
      screenshotPng: Buffer.from([0]),
      tldrawJson: {},
      message: 'first',
      authorId: 'u',
      authorType: 'user',
    });
    const items = await listAnnotations(m.mockup.id);
    expect(items).toHaveLength(1);
    expect(items[0].thread?.status).toBe('open');
    expect(items[0].thread?._count.messages).toBe(1);
  });

  it('cascades on mockup delete', async () => {
    const m = await createMockupFromZip({
      name: 'Z',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    await createAnnotation({
      mockupId: m.mockup.id,
      screenshotPng: Buffer.from([0]),
      tldrawJson: {},
      message: 'x',
      authorId: 'u',
      authorType: 'user',
    });
    await prisma.mockup.delete({ where: { id: m.mockup.id } });
    expect(await prisma.annotation.count()).toBe(0);
    expect(await prisma.thread.count()).toBe(0);
    expect(await prisma.message.count()).toBe(0);
  });

  it('getAnnotation returns thread + messages', async () => {
    const m = await createMockupFromZip({
      name: 'W',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const r = await createAnnotation({
      mockupId: m.mockup.id,
      screenshotPng: Buffer.from([0]),
      tldrawJson: {},
      message: 'hi',
      authorId: 'u',
      authorType: 'user',
    });
    const got = await getAnnotation(r.annotation.id);
    expect(got?.thread?.messages).toHaveLength(1);
    expect(got?.thread?.messages[0].body).toBe('hi');
  });

  it('persists intentType and createdOnVersionId from input', async () => {
    const m = await createMockupFromZip({
      name: 'IntentExplicit',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const r = await createAnnotation({
      mockupId: m.mockup.id,
      screenshotPng: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      tldrawJson: { document: { store: {} } },
      message: 'visual change needed',
      authorId: 'u',
      authorType: 'user',
      intentType: 'visual',
      createdOnVersionId: m.version.id,
    });
    expect(r.annotation.intentType).toBe('visual');
    expect(r.annotation.createdOnVersionId).toBe(m.version.id);
  });

  it('defaults intentType to "other" and stamps current mockup version when omitted', async () => {
    const m = await createMockupFromZip({
      name: 'IntentDefault',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const r = await createAnnotation({
      mockupId: m.mockup.id,
      screenshotPng: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      tldrawJson: { document: { store: {} } },
      message: 'no chip picked',
      authorId: 'u',
      authorType: 'user',
    });
    expect(r.annotation.intentType).toBe('other');
    expect(r.annotation.createdOnVersionId).toBe(m.version.id);
  });

  it('persists arbitrary tldraw JSON verbatim (no placeholder rewriting)', async () => {
    const m = await createMockupFromZip({
      name: 'Q',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const realisticSnapshot = {
      schema: { schemaVersion: 2 },
      store: {
        'shape:abc': { id: 'shape:abc', type: 'draw', x: 10, y: 20, props: {} },
      },
    };
    const r = await createAnnotation({
      mockupId: m.mockup.id,
      screenshotPng: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      tldrawJson: realisticSnapshot,
      message: 'check this',
      authorId: 'u',
      authorType: 'user',
    });
    const got = await getAnnotation(r.annotation.id);
    // Read back the persisted JSON file
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { env } = await import('@/lib/env');
    const persistedRaw = fs.readFileSync(path.join(env().DATA_DIR, got!.tldrawPath), 'utf8');
    expect(JSON.parse(persistedRaw)).toEqual(realisticSnapshot);
  });
});

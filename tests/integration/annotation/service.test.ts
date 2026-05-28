import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCommentAnnotation, getAnnotation, listAnnotations } from '@/lib/annotation/service';
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
      versionCreatedBy: 'u',
      versionCreatedByType: 'user',
    });
    const result = await createCommentAnnotation({
      mockupId: m.mockup.id,
      body: 'Navbar too large',
      anchors: [],
      colorIndex: 0,
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
      versionCreatedBy: 'u',
      versionCreatedByType: 'user',
    });
    await createCommentAnnotation({
      mockupId: m.mockup.id,
      body: 'first',
      anchors: [],
      colorIndex: 0,
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
      versionCreatedBy: 'u',
      versionCreatedByType: 'user',
    });
    await createCommentAnnotation({
      mockupId: m.mockup.id,
      body: 'x',
      anchors: [],
      colorIndex: 0,
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
      versionCreatedBy: 'u',
      versionCreatedByType: 'user',
    });
    const r = await createCommentAnnotation({
      mockupId: m.mockup.id,
      body: 'hi',
      anchors: [],
      colorIndex: 0,
      authorId: 'u',
      authorType: 'user',
    });
    const got = await getAnnotation(r.annotation.id);
    expect(got?.thread?.messages).toHaveLength(1);
    expect(got?.thread?.messages[0].body).toBe('hi');
  });

  it('persists createdOnVersionId from input', async () => {
    const m = await createMockupFromZip({
      name: 'IntentExplicit',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
      versionCreatedBy: 'u',
      versionCreatedByType: 'user',
    });
    const r = await createCommentAnnotation({
      mockupId: m.mockup.id,
      body: 'visual change needed',
      anchors: [],
      colorIndex: 0,
      authorId: 'u',
      authorType: 'user',
      createdOnVersionId: m.version.id,
    });
    expect(r.annotation.createdOnVersionId).toBe(m.version.id);
  });

  it('stamps current mockup version when createdOnVersionId omitted', async () => {
    const m = await createMockupFromZip({
      name: 'IntentDefault',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
      versionCreatedBy: 'u',
      versionCreatedByType: 'user',
    });
    const r = await createCommentAnnotation({
      mockupId: m.mockup.id,
      body: 'no chip picked',
      anchors: [],
      colorIndex: 0,
      authorId: 'u',
      authorType: 'user',
    });
    expect(r.annotation.createdOnVersionId).toBe(m.version.id);
  });
});

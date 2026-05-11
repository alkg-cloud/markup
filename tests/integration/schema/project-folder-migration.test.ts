import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('Project + Folder migration', () => {
  beforeEach(async () => {
    await prisma.mockup.deleteMany();
    await prisma.folder.deleteMany();
    await prisma.project.deleteMany({ where: { slug: { not: 'unsorted' } } });
  });

  it('Project table exists with expected columns', async () => {
    const project = await prisma.project.create({
      data: { name: 'Test', slug: 'test-proj', position: 1 },
    });
    expect(project.id).toBeDefined();
    expect(project.name).toBe('Test');
    expect(project.slug).toBe('test-proj');
    expect(project.position).toBe(1);
    expect(project.createdAt).toBeInstanceOf(Date);
    expect(project.updatedAt).toBeInstanceOf(Date);
  });

  it('Project.slug is unique', async () => {
    await prisma.project.create({ data: { name: 'A', slug: 'dup' } });
    await expect(prisma.project.create({ data: { name: 'B', slug: 'dup' } })).rejects.toThrow();
  });

  it('Folder table exists with expected columns and FK to Project', async () => {
    const project = await prisma.project.create({
      data: { name: 'P', slug: 'p' },
    });
    const folder = await prisma.folder.create({
      data: { name: 'F', projectId: project.id, position: 2 },
    });
    expect(folder.id).toBeDefined();
    expect(folder.projectId).toBe(project.id);
    expect(folder.parentId).toBeNull();
    expect(folder.name).toBe('F');
    expect(folder.position).toBe(2);
    expect(folder.createdAt).toBeInstanceOf(Date);
    expect(folder.updatedAt).toBeInstanceOf(Date);
  });

  it('Folder self-referencing parentId FK works', async () => {
    const project = await prisma.project.create({
      data: { name: 'P', slug: 'p-self' },
    });
    const parent = await prisma.folder.create({
      data: { name: 'Parent', projectId: project.id },
    });
    const child = await prisma.folder.create({
      data: { name: 'Child', projectId: project.id, parentId: parent.id },
    });
    expect(child.parentId).toBe(parent.id);
  });

  it('Folder unique constraint [projectId, parentId, name]', async () => {
    const project = await prisma.project.create({
      data: { name: 'P', slug: 'p-uniq' },
    });
    const parent = await prisma.folder.create({
      data: { name: 'Parent', projectId: project.id },
    });
    await prisma.folder.create({
      data: { name: 'Same', projectId: project.id, parentId: parent.id },
    });
    await expect(
      prisma.folder.create({
        data: { name: 'Same', projectId: project.id, parentId: parent.id },
      }),
    ).rejects.toThrow();
  });

  it('Folder cascade-deletes when Project is deleted', async () => {
    const project = await prisma.project.create({
      data: { name: 'P', slug: 'p-cascade' },
    });
    await prisma.folder.create({
      data: { name: 'F', projectId: project.id },
    });
    await prisma.project.delete({ where: { id: project.id } });
    const folders = await prisma.folder.findMany({
      where: { projectId: project.id },
    });
    expect(folders).toHaveLength(0);
  });

  it('Folder cascade-deletes children when parent deleted', async () => {
    const project = await prisma.project.create({
      data: { name: 'P', slug: 'p-child-cascade' },
    });
    const parent = await prisma.folder.create({
      data: { name: 'Parent', projectId: project.id },
    });
    await prisma.folder.create({
      data: { name: 'Child', projectId: project.id, parentId: parent.id },
    });
    await prisma.folder.delete({ where: { id: parent.id } });
    const children = await prisma.folder.findMany({
      where: { parentId: parent.id },
    });
    expect(children).toHaveLength(0);
  });

  it('Mockup has projectId, folderId, position columns (nullable FK)', async () => {
    const mockup = await prisma.mockup.create({
      data: { name: 'M', slug: 'm-fk-test' },
    });
    expect(mockup.projectId).toBeNull();
    expect(mockup.folderId).toBeNull();
    expect(mockup.position).toBe(0);
  });

  it('Mockup.projectId SetNull on Project delete', async () => {
    const project = await prisma.project.create({
      data: { name: 'P', slug: 'p-setnull' },
    });
    const mockup = await prisma.mockup.create({
      data: { name: 'M', slug: 'm-setnull', projectId: project.id },
    });
    await prisma.project.delete({ where: { id: project.id } });
    const updated = await prisma.mockup.findUnique({
      where: { id: mockup.id },
    });
    expect(updated!.projectId).toBeNull();
  });

  it('Mockup.folderId SetNull on Folder delete', async () => {
    const project = await prisma.project.create({
      data: { name: 'P', slug: 'p-folder-setnull' },
    });
    const folder = await prisma.folder.create({
      data: { name: 'F', projectId: project.id },
    });
    const mockup = await prisma.mockup.create({
      data: {
        name: 'M',
        slug: 'm-folder-setnull',
        projectId: project.id,
        folderId: folder.id,
      },
    });
    await prisma.folder.delete({ where: { id: folder.id } });
    const updated = await prisma.mockup.findUnique({
      where: { id: mockup.id },
    });
    expect(updated!.folderId).toBeNull();
  });

  it('Backfill: "Unsorted" project exists and orphan mockups belong to it', async () => {
    const unsorted = await prisma.project.findUnique({
      where: { slug: 'unsorted' },
    });
    expect(unsorted).not.toBeNull();
    expect(unsorted!.name).toBe('Unsorted');

    const orphans = await prisma.mockup.findMany({
      where: { projectId: null },
    });
    expect(orphans).toHaveLength(0);
  });
});

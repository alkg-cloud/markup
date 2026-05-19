import 'server-only';

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { MAX_ANCESTOR_ITERATIONS, MAX_FOLDER_DEPTH } from './constants';

const log = logger.child({ name: 'project-service' });

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return base || 'project';
}

async function ensureUniqueProjectSlug(name: string): Promise<string> {
  const base = makeSlug(name);
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? base : `${base}-${i}`;
    if (!(await prisma.project.findUnique({ where: { slug: candidate } }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// Project CRUD
// ---------------------------------------------------------------------------

export async function listProjects() {
  const rows = await prisma.project.findMany({
    orderBy: { position: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      position: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { mockups: true, folders: true } },
    },
  });
  // Flatten Prisma's `_count` into a stable shape the `all-projects`
  // grid (and any other client) can consume directly. Keeping the raw
  // `_count` in the payload would leak the ORM convention into the API
  // contract.
  return rows.map(({ _count, ...rest }) => ({
    ...rest,
    mockupCount: _count.mockups,
    folderCount: _count.folders,
  }));
}

export async function createProject(input: { name: string; icon?: string }) {
  const slug = await ensureUniqueProjectSlug(input.name);
  const maxPos = await prisma.project.aggregate({
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? 0) + 1024;
  const project = await prisma.project.create({
    data: { name: input.name, slug, position, icon: input.icon ?? null },
  });
  log.info({ projectId: project.id }, 'project_created');
  return project;
}

export async function getProject(id: string) {
  return prisma.project.findUnique({ where: { id } });
}

export async function updateProject(id: string, input: { name?: string; icon?: string | null }) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return null;
  // When the name changes, regenerate the slug so the canonical
  // path-based URL (`/projects/<slug>`) keeps reading the latest name.
  // Slug stays stable if only the icon is changing.
  const renamed = input.name != null && input.name !== existing.name;
  const slug = renamed ? await ensureUniqueProjectSlug(input.name as string) : undefined;
  return prisma.project.update({
    where: { id },
    data: {
      name: input.name,
      icon: input.icon,
      ...(slug ? { slug } : {}),
    },
  });
}

export async function deleteProject(id: string) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.project.delete({ where: { id } });
  log.info({ projectId: id }, 'project_deleted');
  return existing;
}

// ---------------------------------------------------------------------------
// Folder depth helpers
// ---------------------------------------------------------------------------

async function getFolderDepth(folderId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = folderId;
  const seen = new Set<string>();
  while (currentId && depth < MAX_ANCESTOR_ITERATIONS) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const row: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!row) break;
    depth++;
    currentId = row.parentId;
  }
  return depth;
}

async function getSubtreeMaxDepth(folderId: string, currentDepth = 0): Promise<number> {
  if (currentDepth >= MAX_FOLDER_DEPTH) return 0;
  let maxDepth = 0;
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true },
  });
  for (const child of children) {
    const childDepth = await getSubtreeMaxDepth(child.id, currentDepth + 1);
    maxDepth = Math.max(maxDepth, childDepth + 1);
  }
  return maxDepth;
}

// ---------------------------------------------------------------------------
// Folder CRUD
// ---------------------------------------------------------------------------

export async function createFolder(input: {
  projectId: string;
  name: string;
  parentId?: string | null;
}) {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
  });
  if (!project) return { error: 'project_not_found' as const };

  if (input.parentId) {
    const parent = await prisma.folder.findUnique({
      where: { id: input.parentId },
    });
    if (!parent || parent.projectId !== input.projectId) {
      return { error: 'parent_not_found' as const };
    }
    const parentDepth = await getFolderDepth(input.parentId);
    if (parentDepth >= MAX_FOLDER_DEPTH) {
      return { error: 'max_depth_exceeded' as const };
    }
  }

  // SQLite treats NULL parentId as distinct for the unique constraint —
  // enforce root-level name uniqueness in the service layer.
  const duplicate = await prisma.folder.findFirst({
    where: {
      projectId: input.projectId,
      parentId: input.parentId ?? null,
      name: input.name,
    },
  });
  if (duplicate) return { error: 'name_exists' as const };

  const maxPos = await prisma.folder.aggregate({
    where: {
      projectId: input.projectId,
      parentId: input.parentId ?? null,
    },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? 0) + 1024;

  const folder = await prisma.folder.create({
    data: {
      projectId: input.projectId,
      parentId: input.parentId ?? null,
      name: input.name,
      position,
    },
  });
  log.info({ folderId: folder.id, projectId: input.projectId }, 'folder_created');
  return { folder };
}

export async function getFolder(id: string) {
  return prisma.folder.findUnique({
    where: { id },
    include: {
      children: { orderBy: { position: 'asc' } },
      mockups: { orderBy: { position: 'asc' } },
    },
  });
}

export async function updateFolder(id: string, input: { name?: string }) {
  const existing = await prisma.folder.findUnique({ where: { id } });
  if (!existing) return null;

  if (input.name && input.name !== existing.name) {
    const duplicate = await prisma.folder.findFirst({
      where: {
        projectId: existing.projectId,
        parentId: existing.parentId,
        name: input.name,
        id: { not: id },
      },
    });
    if (duplicate) return { error: 'name_exists' as const };
  }

  return {
    folder: await prisma.folder.update({
      where: { id },
      data: { name: input.name },
    }),
  };
}

export async function deleteFolder(id: string) {
  const existing = await prisma.folder.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.folder.delete({ where: { id } });
  log.info({ folderId: id }, 'folder_deleted');
  return existing;
}

// ---------------------------------------------------------------------------
// Project tree
// ---------------------------------------------------------------------------

interface TreeFolder {
  id: string;
  name: string;
  position: number;
  children: TreeFolder[];
  mockups: TreeMockup[];
}

interface TreeMockup {
  id: string;
  name: string;
  slug: string;
  status: string;
  position: number;
}

export interface ProjectTree {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
  folders: TreeFolder[];
  mockups: TreeMockup[];
}

export async function getProjectTree(projectId: string): Promise<ProjectTree | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) return null;

  const allFolders = await prisma.folder.findMany({
    where: { projectId },
    orderBy: { position: 'asc' },
    select: { id: true, name: true, parentId: true, position: true },
  });

  const allMockups = await prisma.mockup.findMany({
    where: { projectId, status: { not: 'archived' } },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      folderId: true,
      position: true,
    },
  });

  const folderMap = new Map<string | null, typeof allFolders>();
  for (const f of allFolders) {
    const key = f.parentId;
    if (!folderMap.has(key)) folderMap.set(key, []);
    folderMap.get(key)!.push(f);
  }

  const mockupMap = new Map<string | null, typeof allMockups>();
  for (const m of allMockups) {
    const key = m.folderId;
    if (!mockupMap.has(key)) mockupMap.set(key, []);
    mockupMap.get(key)!.push(m);
  }

  function buildFolder(f: (typeof allFolders)[number]): TreeFolder {
    const childFolders = folderMap.get(f.id) ?? [];
    const mockups = mockupMap.get(f.id) ?? [];
    return {
      id: f.id,
      name: f.name,
      position: f.position,
      children: childFolders.map(buildFolder),
      mockups: mockups.map(({ folderId: _, ...m }) => m),
    };
  }

  const rootFolders = folderMap.get(null) ?? [];
  const rootMockups = (mockupMap.get(null) ?? []).map(({ folderId: _, ...m }) => m);

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    icon: project.icon,
    position: project.position,
    folders: rootFolders.map(buildFolder),
    mockups: rootMockups,
  };
}

// ---------------------------------------------------------------------------
// Move + reorder
// ---------------------------------------------------------------------------

async function isDescendantOf(folderId: string, ancestorId: string): Promise<boolean> {
  let currentId: string | null = folderId;
  const seen = new Set<string>();
  while (currentId) {
    if (currentId === ancestorId) return true;
    if (seen.has(currentId)) return false;
    seen.add(currentId);
    const row: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!row) return false;
    currentId = row.parentId;
  }
  return false;
}

export async function moveFolder(input: {
  folderId: string;
  parentId: string | null;
  position: number;
}) {
  const folder = await prisma.folder.findUnique({
    where: { id: input.folderId },
  });
  if (!folder) return { error: 'not_found' as const };

  if (input.parentId) {
    if (input.parentId === input.folderId) {
      return { error: 'cycle_detected' as const };
    }
    const target = await prisma.folder.findUnique({
      where: { id: input.parentId },
    });
    if (!target || target.projectId !== folder.projectId) {
      return { error: 'parent_not_found' as const };
    }
    if (await isDescendantOf(input.parentId, input.folderId)) {
      return { error: 'cycle_detected' as const };
    }
    const targetDepth = await getFolderDepth(input.parentId);
    const subtreeDepth = await getSubtreeMaxDepth(input.folderId);
    if (targetDepth + 1 + subtreeDepth > MAX_FOLDER_DEPTH) {
      return { error: 'max_depth_exceeded' as const };
    }
  }

  const duplicate = await prisma.folder.findFirst({
    where: {
      projectId: folder.projectId,
      parentId: input.parentId,
      name: folder.name,
      id: { not: input.folderId },
    },
  });
  if (duplicate) return { error: 'name_exists' as const };

  const updated = await prisma.$transaction(async (tx) => {
    return tx.folder.update({
      where: { id: input.folderId },
      data: { parentId: input.parentId, position: input.position },
    });
  });
  log.info({ folderId: input.folderId, parentId: input.parentId }, 'folder_moved');
  return { folder: updated };
}

export async function moveMockup(input: {
  mockupId: string;
  projectId: string;
  folderId: string | null;
  position: number;
}) {
  const mockup = await prisma.mockup.findUnique({
    where: { id: input.mockupId },
  });
  if (!mockup) return { error: 'mockup_not_found' as const };

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
  });
  if (!project) return { error: 'project_not_found' as const };

  if (input.folderId) {
    const folder = await prisma.folder.findUnique({
      where: { id: input.folderId },
    });
    if (!folder || folder.projectId !== input.projectId) {
      return { error: 'folder_not_found' as const };
    }
  }

  const updated = await prisma.mockup.update({
    where: { id: input.mockupId },
    data: {
      projectId: input.projectId,
      folderId: input.folderId,
      position: input.position,
    },
  });
  log.info(
    {
      mockupId: input.mockupId,
      projectId: input.projectId,
      folderId: input.folderId,
    },
    'mockup_moved',
  );
  return { mockup: updated };
}

export async function reorderProjects(ids: string[]) {
  const existing = await prisma.project.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((p) => p.id));
  const missingIds = ids.filter((id) => !existingIds.has(id));
  if (missingIds.length > 0) return { error: 'not_found' as const, missingIds };

  const updates = ids.map((id, index) =>
    prisma.project.update({
      where: { id },
      data: { position: index * 1024 },
    }),
  );
  await prisma.$transaction(updates);
  log.info({ count: ids.length }, 'projects_reordered');
  return { ok: true as const };
}

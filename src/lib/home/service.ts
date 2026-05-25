import 'server-only';

import { resolveDisplayNames } from '@/lib/auth/resolve-display-name';
import { prisma } from '@/lib/prisma';
import { mockupSlugHref, projectDisplayName } from '@/lib/project/routes';
import { listProjects } from '@/lib/project/service';
import type { HomeData, HomeIdentity, OrphanEntry, ProjectListEntry, RecentEntry } from './types';

const RECENTS_LIMIT = 6;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type StatusLiteral = RecentEntry['status'];

interface FolderRow {
  id: string;
  name: string;
  parentId: string | null;
  projectId: string;
}

function computeTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

/**
 * Walks a folder's ancestor chain (deepest first), reverses to produce a
 * root-to-leaf list of names. Returns `[]` for `null` or for chains that
 * dead-end (folder row missing from the pre-fetched map).
 *
 * Bounded by `seen` to defend against parentId cycles in legacy data; the
 * schema doesn't enforce acyclicity at the DB level.
 */
function collectFolderChain(folderId: string | null, folderById: Map<string, FolderRow>): string[] {
  const chain: string[] = [];
  let cur: string | null = folderId;
  const seen = new Set<string>();
  while (cur) {
    if (seen.has(cur)) break;
    seen.add(cur);
    const f = folderById.get(cur);
    if (!f) break;
    chain.push(f.name);
    cur = f.parentId;
  }
  return chain.reverse();
}

/**
 * Aggregates everything the workspace home (`/`) needs in a single call:
 *
 *  - The caller's identity snapshot (passed in by the route handler).
 *  - A time-of-day greeting + 24h "updated" count.
 *  - Recents (top 6 mockups by `updatedAt` desc, cross-project, includes
 *    orphans, excludes archived) with project + folder breadcrumbs.
 *  - The project list (same shape as `GET /api/projects`).
 *  - Orphan mockups (`projectId === null`, non-archived) by `updatedAt`
 *    desc.
 *
 * No N+1: all mockups, projects, and folders are pre-fetched in parallel,
 * indexed in memory, and breadcrumbs are walked off the in-memory maps.
 */
export async function getHomeData(identity: HomeIdentity): Promise<HomeData> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - TWENTY_FOUR_HOURS_MS);

  const [mockups, projects, folders, updatedSinceYesterdayCount] = await Promise.all([
    prisma.mockup.findMany({
      where: { status: { not: 'archived' } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        updatedAt: true,
        projectId: true,
        folderId: true,
        createdBy: true,
        createdByType: true,
      },
    }),
    listProjects(),
    prisma.folder.findMany({
      select: { id: true, name: true, parentId: true, projectId: true },
    }),
    prisma.mockup.count({ where: { updatedAt: { gt: yesterday } } }),
  ]);

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const folderById = new Map<string, FolderRow>(folders.map((f) => [f.id, f]));

  // Batch-resolve display names across the union of mockup + project creators
  // so each row can surface a `createdByName` without N+1 lookups.
  const nameInputs = [
    ...mockups
      .filter((m) => m.createdBy && m.createdByType)
      .map((m) => ({
        createdBy: m.createdBy as string,
        createdByType: m.createdByType as string,
      })),
    ...projects
      .filter((p) => p.createdBy && p.createdByType)
      .map((p) => ({
        createdBy: p.createdBy as string,
        createdByType: p.createdByType as string,
      })),
  ];
  const nameMap = await resolveDisplayNames(nameInputs);

  function nameFor(createdBy: string | null): string | null {
    if (!createdBy) return null;
    return nameMap.get(createdBy)?.name ?? null;
  }

  function buildBreadcrumb(projectId: string | null, folderId: string | null): string {
    if (!projectId) return 'Ungrouped';
    const project = projectById.get(projectId);
    const projectLabel = project
      ? projectDisplayName({ slug: project.slug, name: project.name })
      : 'Project';
    const folderChain = collectFolderChain(folderId, folderById);
    if (folderChain.length === 0) return projectLabel;
    return [projectLabel, ...folderChain].join(' · ');
  }

  const recents: RecentEntry[] = mockups.slice(0, RECENTS_LIMIT).map((m) => {
    const project = m.projectId ? projectById.get(m.projectId) : null;
    const projectSlug = project?.slug ?? 'unsorted';
    const folderChain = collectFolderChain(m.folderId, folderById);
    return {
      id: m.id,
      name: m.name,
      slug: m.slug,
      status: m.status as StatusLiteral,
      updatedAt: m.updatedAt.toISOString(),
      href: mockupSlugHref(projectSlug, folderChain, m.slug),
      breadcrumb: buildBreadcrumb(m.projectId, m.folderId),
      createdBy: m.createdBy,
      createdByType: m.createdByType as 'user' | 'agent' | null,
      createdByName: nameFor(m.createdBy),
    };
  });

  const orphans: OrphanEntry[] = mockups
    .filter((m) => m.projectId === null)
    .map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      status: m.status as StatusLiteral,
      updatedAt: m.updatedAt.toISOString(),
      href: mockupSlugHref('unsorted', [], m.slug),
      createdBy: m.createdBy,
      createdByType: m.createdByType as 'user' | 'agent' | null,
      createdByName: nameFor(m.createdBy),
    }));

  const projectsOut: ProjectListEntry[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    icon: p.icon,
    position: p.position,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    mockupCount: p.mockupCount,
    folderCount: p.folderCount,
    createdBy: p.createdBy,
    createdByType: p.createdByType as 'user' | 'agent' | null,
    createdByName: nameFor(p.createdBy),
  }));

  return {
    identity,
    greeting: {
      timeOfDay: computeTimeOfDay(now),
      updatedSinceYesterdayCount,
    },
    recents,
    projects: projectsOut,
    orphans,
  };
}

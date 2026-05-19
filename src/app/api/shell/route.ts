import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { prisma } from '@/lib/prisma';
import { mockupSlugHref } from '@/lib/project/routes';
import { getProjectTree, listProjects, type ProjectTree } from '@/lib/project/service';

const SIDEBAR_COOKIE = 'markup-sidebar-collapsed';

interface RecentMockup {
  id: string;
  name: string;
  path?: string;
  updatedAt: string;
  href: string;
}

// Single aggregator for `AppShell`. Returns everything the client shell
// needs to render the sidebar + topbar + command-palette in one round-trip:
// the viewer profile (name/email), the projects tree (with "unsorted"
// split out as `orphanMockups`), a flat mockup-name lookup, the recents
// map, and the persisted sidebar-collapsed flag from the cookie.
export async function GET(req: Request) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Viewer profile — agents have no user row to resolve.
  let userName: string | undefined;
  let userEmail: string | undefined;
  if (ident.kind === 'user') {
    const user = await prisma.user.findUnique({
      where: { id: ident.userId },
      select: { name: true, email: true },
    });
    userName = user?.name ?? undefined;
    userEmail = user?.email ?? undefined;
  }

  const projectList = await listProjects();
  const allTrees = (await Promise.all(projectList.map((p) => getProjectTree(p.id)))).filter(
    (t): t is ProjectTree => t !== null,
  );

  const unsortedTree = allTrees.find((t) => t.slug === 'unsorted') ?? null;
  const orphanMockups = unsortedTree ? unsortedTree.mockups : [];
  const projects = allTrees.filter((t) => t.slug !== 'unsorted');

  const allMockups = await prisma.mockup.findMany({
    where: { status: { not: 'archived' } },
    select: {
      id: true,
      name: true,
      slug: true,
      updatedAt: true,
      project: { select: { slug: true } },
      folder: { select: { id: true, name: true } },
    },
  });
  const allFolders = await prisma.folder.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const folderById = new Map(allFolders.map((f) => [f.id, f]));
  const buildFolderPath = (startId: string | undefined): string[] => {
    if (!startId) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    let cur: string | undefined = startId;
    while (cur) {
      if (seen.has(cur)) break;
      seen.add(cur);
      const f = folderById.get(cur);
      if (!f) break;
      out.unshift(f.name);
      cur = f.parentId ?? undefined;
    }
    return out;
  };

  const mockupNames: Record<string, string> = {};
  const recentMockups: Record<string, RecentMockup> = {};
  for (const m of allMockups) {
    mockupNames[m.id] = m.name;
    const projectSlug = m.project?.slug ?? 'unsorted';
    const folderPath = buildFolderPath(m.folder?.id);
    recentMockups[m.id] = {
      id: m.id,
      name: m.name,
      path: m.folder?.name,
      updatedAt: m.updatedAt.toISOString(),
      href: mockupSlugHref(projectSlug, folderPath, m.slug),
    };
  }

  // Cookie-driven default for the sidebar collapse state. Reading via the
  // request's cookie header keeps the route handler agnostic of `next/headers`.
  const cookieHeader = req.headers.get('cookie') ?? '';
  let sidebarCollapsed = false;
  for (const part of cookieHeader.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq) === SIDEBAR_COOKIE && part.slice(eq + 1) === 'true') {
      sidebarCollapsed = true;
      break;
    }
  }

  return NextResponse.json({
    identity: { kind: ident.kind, name: userName, email: userEmail },
    projects,
    orphanMockups,
    mockupNames,
    recentMockups,
    sidebarCollapsed,
  });
}

export const dynamic = 'force-dynamic';

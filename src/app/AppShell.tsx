import { cookies, headers } from 'next/headers';
import { mockupSlugHref } from '@/lib/project/routes';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { CommandPalette } from '@/components/CommandPalette/CommandPalette';
import type { TreeMockup } from '@/components/ProjectTree/ProjectTree';
import { identify } from '@/lib/auth/identify';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { prisma } from '@/lib/prisma';
import { getProjectTree, listProjects } from '@/lib/project/service';
import styles from './projects/layout.module.css';
import { ProjectSidebar } from './projects/ProjectSidebar';

export async function getAuthenticatedIdentity() {
  if (!(await isSetupCompleted())) redirect('/setup');
  const cs = await cookies();
  const hs = await headers();
  const fakeReq = {
    cookies: {
      get: (k: string) => {
        const c = cs.get(k);
        return c ? { value: c.value } : undefined;
      },
    },
    headers: { get: (k: string) => hs.get(k) },
  } as Parameters<typeof identify>[0];
  const id = await identify(fakeReq);
  if (!id) redirect('/login');
  return id;
}

export async function AppShell({ children }: { children: ReactNode }) {
  await getAuthenticatedIdentity();
  const cs = await cookies();
  const sidebarCollapsed = cs.get('markup-sidebar-collapsed')?.value === 'true';

  const projectList = await listProjects();
  const allTrees = (await Promise.all(projectList.map((p) => getProjectTree(p.id)))).filter(
    (t) => t !== null,
  );

  // Separate the synthetic "unsorted" pseudo-project from real projects.
  // Its mockups become orphanMockups (rendered under "NO PROJECT").
  const unsortedTree = allTrees.find((t) => t.slug === 'unsorted') ?? null;
  const orphanMockups: TreeMockup[] = unsortedTree ? unsortedTree.mockups : [];
  const treeProjects = allTrees.filter((t) => t.slug !== 'unsorted');

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
  // One-shot lookup table so we can resolve each mockup's full folder
  // ancestor chain without spamming Prisma per mockup.
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
  const recentMockups: Record<
    string,
    { id: string; name: string; path?: string; updatedAt: string; href: string }
  > = {};
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

  return (
    <div className={styles.shell}>
      <ProjectSidebar
        projects={treeProjects}
        orphanMockups={orphanMockups}
        mockupNames={mockupNames}
        recentMockups={recentMockups}
        defaultCollapsed={sidebarCollapsed}
      />
      <main className={styles.main}>{children}</main>
      <CommandPalette projects={treeProjects} />
    </div>
  );
}

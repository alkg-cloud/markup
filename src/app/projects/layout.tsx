import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { CommandPalette } from '@/components/CommandPalette/CommandPalette';
import { identify } from '@/lib/auth/identify';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { prisma } from '@/lib/prisma';
import { getProjectTree, listProjects } from '@/lib/project/service';
import styles from './layout.module.css';
import { ProjectSidebar } from './ProjectSidebar';

export default async function ProjectsLayout({ children }: { children: ReactNode }) {
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

  const projectList = await listProjects();
  const treeProjects = (await Promise.all(projectList.map((p) => getProjectTree(p.id)))).filter(
    (t) => t !== null,
  );

  const allMockups = await prisma.mockup.findMany({
    where: { status: { not: 'archived' } },
    select: { id: true, name: true, updatedAt: true, folder: { select: { name: true } } },
  });
  const mockupNames: Record<string, string> = {};
  const recentMockups: Record<
    string,
    { id: string; name: string; path?: string; updatedAt: string }
  > = {};
  for (const m of allMockups) {
    mockupNames[m.id] = m.name;
    recentMockups[m.id] = {
      id: m.id,
      name: m.name,
      path: m.folder?.name,
      updatedAt: m.updatedAt.toISOString(),
    };
  }

  return (
    <div className={styles.shell}>
      <ProjectSidebar
        projects={treeProjects}
        mockupNames={mockupNames}
        recentMockups={recentMockups}
      />
      <main className={styles.main}>{children}</main>
      <CommandPalette projects={treeProjects} />
    </div>
  );
}

export const dynamic = 'force-dynamic';

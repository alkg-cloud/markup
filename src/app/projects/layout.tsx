import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { identify } from '@/lib/auth/identify';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { prisma } from '@/lib/prisma';
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

  const projects = await prisma.project.findMany({
    orderBy: { position: 'asc' },
    include: {
      folders: {
        where: { parentId: null },
        orderBy: { position: 'asc' },
        include: {
          children: {
            orderBy: { position: 'asc' },
            include: {
              children: {
                orderBy: { position: 'asc' },
                include: {
                  children: {
                    orderBy: { position: 'asc' },
                    include: {
                      mockups: {
                        orderBy: { position: 'asc' },
                        where: { status: { not: 'archived' } },
                      },
                    },
                  },
                  mockups: { orderBy: { position: 'asc' }, where: { status: { not: 'archived' } } },
                },
              },
              mockups: { orderBy: { position: 'asc' }, where: { status: { not: 'archived' } } },
            },
          },
          mockups: { orderBy: { position: 'asc' }, where: { status: { not: 'archived' } } },
        },
      },
      mockups: {
        where: { folderId: null, status: { not: 'archived' } },
        orderBy: { position: 'asc' },
      },
    },
  });

  const allMockups = await prisma.mockup.findMany({
    where: { status: { not: 'archived' } },
    select: { id: true, name: true },
  });
  const mockupNames: Record<string, string> = {};
  for (const m of allMockups) mockupNames[m.id] = m.name;

  function serializeFolder(
    f: (typeof projects)[0]['folders'][0],
  ): import('@/components/ProjectTree/ProjectTree').TreeFolder {
    return {
      id: f.id,
      name: f.name,
      position: f.position,
      children: (f.children as (typeof projects)[0]['folders']).map(serializeFolder),
      mockups: f.mockups.map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        status: m.status,
        position: m.position,
      })),
    };
  }

  const treeProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    position: p.position,
    folders: p.folders.map(serializeFolder),
    mockups: p.mockups.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      status: m.status,
      position: m.position,
    })),
  }));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'var(--sidebar-width) 1fr',
        gridTemplateRows: '1fr',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <ProjectSidebar projects={treeProjects} mockupNames={mockupNames} />
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg)',
        }}
      >
        {children}
      </main>
    </div>
  );
}

export const dynamic = 'force-dynamic';

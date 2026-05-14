import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { identify } from '@/lib/auth/identify';
import { prisma } from '@/lib/prisma';
import { ProjectContent } from './ProjectContent';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      folders: {
        where: { parentId: null },
        orderBy: { position: 'asc' },
        include: {
          _count: { select: { children: true, mockups: true } },
        },
      },
      mockups: {
        where: { folderId: null, status: { not: 'archived' } },
        orderBy: { position: 'asc' },
        include: {
          _count: { select: { annotations: true } },
        },
      },
    },
  });

  if (!project) notFound();

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
  const identity = await identify(fakeReq);
  let userName: string | undefined;
  let userEmail: string | undefined;
  if (identity?.kind === 'user') {
    const user = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { name: true, email: true },
    });
    userName = user?.name ?? undefined;
    userEmail = user?.email ?? undefined;
  }

  const folders = project.folders.map((f) => ({
    id: f.id,
    name: f.name,
    childCount: f._count.children + f._count.mockups,
  }));

  const mockups = project.mockups.map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    status: m.status,
    updatedAt: m.updatedAt.toISOString(),
    annotationCount: m._count.annotations,
  }));

  return (
    <ProjectContent
      projectName={project.name}
      projectSlug={project.slug}
      folders={folders}
      mockups={mockups}
      breadcrumbs={[{ label: project.name, href: `/projects/${project.slug}` }]}
      userName={userName}
      userEmail={userEmail}
    />
  );
}

export const dynamic = 'force-dynamic';

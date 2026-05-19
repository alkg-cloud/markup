import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { projectDisplayName, projectHref } from '@/lib/project/routes';
import { getAuthenticatedIdentity } from '../../../AppShell';
import { ProjectContent } from '../../../projects/[slug]/ProjectContent';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const identity = await getAuthenticatedIdentity();
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      folders: {
        where: { parentId: null },
        orderBy: { position: 'asc' },
        include: { _count: { select: { children: true, mockups: true } } },
      },
      mockups: {
        where: { folderId: null, status: { not: 'archived' } },
        orderBy: { position: 'asc' },
        include: { _count: { select: { annotations: true } } },
      },
    },
  });
  if (!project) notFound();

  let userName: string | undefined;
  let userEmail: string | undefined;
  if (identity.kind === 'user') {
    const user = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { name: true, email: true },
    });
    userName = user?.name ?? undefined;
    userEmail = user?.email ?? undefined;
  }

  return (
    <ProjectContent
      projectName={projectDisplayName(project)}
      projectSlug={project.slug}
      projectId={project.id}
      projectIcon={project.icon ?? null}
      folders={project.folders.map((f) => ({
        id: f.id,
        name: f.name,
        childCount: f._count.children + f._count.mockups,
      }))}
      mockups={project.mockups.map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        status: m.status,
        updatedAt: m.updatedAt.toISOString(),
        annotationCount: m._count.annotations,
      }))}
      breadcrumbs={[{ label: projectDisplayName(project), href: projectHref(project.slug) }]}
      userName={userName}
      userEmail={userEmail}
    />
  );
}

export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
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
    />
  );
}

export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProjectContent } from '../ProjectContent';

interface Props {
  params: Promise<{ slug: string; folderId: string }>;
}

export default async function FolderPage({ params }: Props) {
  const { slug, folderId } = await params;

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) notFound();

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      children: {
        orderBy: { position: 'asc' },
        include: {
          _count: { select: { children: true, mockups: true } },
        },
      },
      mockups: {
        where: { status: { not: 'archived' } },
        orderBy: { position: 'asc' },
        include: {
          _count: { select: { annotations: true } },
        },
      },
    },
  });
  if (!folder || folder.projectId !== project.id) notFound();

  const ancestors = await buildAncestors(folder.parentId);

  const folders = folder.children.map((f) => ({
    id: f.id,
    name: f.name,
    childCount: f._count.children + f._count.mockups,
  }));

  const mockups = folder.mockups.map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    status: m.status,
    updatedAt: m.updatedAt.toISOString(),
    annotationCount: m._count.annotations,
  }));

  const breadcrumbs = [
    { label: project.name, href: `/projects/${project.slug}` },
    ...ancestors.map((a) => ({ label: a.name, href: `/projects/${project.slug}/${a.id}` })),
    { label: folder.name, href: `/projects/${project.slug}/${folder.id}` },
  ];

  return (
    <ProjectContent
      projectName={project.name}
      projectSlug={project.slug}
      folders={folders}
      mockups={mockups}
      breadcrumbs={breadcrumbs}
    />
  );
}

async function buildAncestors(
  parentId: string | null,
): Promise<Array<{ id: string; name: string }>> {
  if (!parentId) return [];
  const ancestors: Array<{ id: string; name: string }> = [];
  let current: string | null = parentId;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current)) break;
    seen.add(current);
    const f: { id: string; name: string; parentId: string | null } | null =
      await prisma.folder.findUnique({
        where: { id: current },
        select: { id: true, name: true, parentId: true },
      });
    if (!f) break;
    ancestors.unshift({ id: f.id, name: f.name });
    current = f.parentId;
  }
  return ancestors;
}

export const dynamic = 'force-dynamic';

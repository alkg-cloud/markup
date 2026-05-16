import { notFound } from 'next/navigation';
import { Topbar } from '@/components/Topbar/Topbar';
import { prisma } from '@/lib/prisma';
import { projectDisplayName, projectHref } from '@/lib/project/routes';
import { getAuthenticatedIdentity } from '../AppShell';
import { ProjectContent } from '../projects/[slug]/ProjectContent';

interface Props {
  searchParams: Promise<{ project?: string; folder?: string }>;
}

export default async function Root({ searchParams }: Props) {
  const identity = await getAuthenticatedIdentity();
  const params = await searchParams;
  const selectedProject =
    (params.project
      ? await prisma.project.findUnique({ where: { slug: params.project } })
      : null) ??
    (await prisma.project.findFirst({
      orderBy: { position: 'asc' },
    }));

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

  if (!selectedProject) {
    return (
      <>
        <Topbar breadcrumbs={[]} userName={userName} userEmail={userEmail} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: 'var(--type-sm)',
          }}
        >
          Nenhum projeto encontrado.
        </div>
      </>
    );
  }

  if (params.folder) {
    const folder = await prisma.folder.findUnique({
      where: { id: params.folder },
      include: {
        children: {
          orderBy: { position: 'asc' },
          include: { _count: { select: { children: true, mockups: true } } },
        },
        mockups: {
          where: { status: { not: 'archived' } },
          orderBy: { position: 'asc' },
          include: { _count: { select: { annotations: true } } },
        },
      },
    });
    if (!folder || folder.projectId !== selectedProject.id) notFound();

    const ancestors = await buildAncestors(folder.parentId);
    return (
      <ProjectContent
        projectName={projectDisplayName(selectedProject)}
        projectSlug={selectedProject.slug}
        projectId={selectedProject.id}
        projectIcon={selectedProject.icon ?? null}
        folderName={folder.name}
        currentFolderId={folder.id}
        folders={folder.children.map((f) => ({
          id: f.id,
          name: f.name,
          childCount: f._count.children + f._count.mockups,
        }))}
        mockups={folder.mockups.map((m) => ({
          id: m.id,
          name: m.name,
          slug: m.slug,
          status: m.status,
          updatedAt: m.updatedAt.toISOString(),
          annotationCount: m._count.annotations,
        }))}
        breadcrumbs={[
          { label: projectDisplayName(selectedProject), href: projectHref(selectedProject.slug) },
          ...ancestors.map((a) => ({
            label: a.name,
            href: projectHref(selectedProject.slug, a.id),
          })),
          { label: folder.name, href: projectHref(selectedProject.slug, folder.id) },
        ]}
        userName={userName}
        userEmail={userEmail}
      />
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: selectedProject.id },
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

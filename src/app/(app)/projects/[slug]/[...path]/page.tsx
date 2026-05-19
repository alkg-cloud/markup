import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { resolveProjectPath } from '@/lib/project/path-resolver';
import { folderHref, projectDisplayName, projectHref } from '@/lib/project/routes';
import { getAuthenticatedIdentity } from '../../../../AppShell';
import { ProjectContent } from '../../../../projects/[slug]/ProjectContent';

interface Props {
  params: Promise<{ slug: string; path: string[] }>;
}

/**
 * Catch-all route under `/projects/<slug>/…` — the segments resolve
 * either to a folder (and we render the folder view) or to a mockup
 * (and we redirect to `/mockups/<id>` to reuse the dedicated viewer
 * route). See `lib/project/path-resolver.ts`.
 */
export default async function ProjectPathPage({ params }: Props) {
  const identity = await getAuthenticatedIdentity();
  const { slug, path } = await params;
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) notFound();

  const resolution = await resolveProjectPath(project.id, path);
  if (!resolution) notFound();

  if (resolution.kind === 'mockup') {
    // Mockup viewer lives at /mockups/[id]; redirect to keep the
    // viewer route stable.
    redirect(`/mockups/${resolution.mockupId}`);
  }

  // Folder view — re-fetch with children + mockups for rendering.
  const folder = await prisma.folder.findUnique({
    where: { id: resolution.folderId },
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
  if (!folder) notFound();

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

  // Build breadcrumbs incrementally so each ancestor links to its own
  // folder URL (cumulative path).
  const ancestorBreadcrumbs = resolution.pathNames.slice(0, -1).map((_, i) => {
    const subPath = resolution.pathNames.slice(0, i + 1);
    return {
      label: subPath[subPath.length - 1],
      href: folderHref(project.slug, subPath),
    };
  });

  return (
    <ProjectContent
      projectName={projectDisplayName(project)}
      projectSlug={project.slug}
      projectId={project.id}
      projectIcon={project.icon ?? null}
      folderName={folder.name}
      currentFolderId={folder.id}
      folderPathNames={resolution.pathNames}
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
        { label: projectDisplayName(project), href: projectHref(project.slug) },
        ...ancestorBreadcrumbs,
        { label: folder.name, href: folderHref(project.slug, resolution.pathNames) },
      ]}
      userName={userName}
      userEmail={userEmail}
    />
  );
}

export const dynamic = 'force-dynamic';

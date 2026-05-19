import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { prisma } from '@/lib/prisma';
import { resolveProjectPath } from '@/lib/project/path-resolver';
import { folderHref, mockupSlugHref, projectDisplayName, projectHref } from '@/lib/project/routes';

// Aggregator for `/projects/[slug]/[...path]` — resolves the trailing
// path segments to either a folder or a mockup, and returns the payload
// the client page needs to render either branch. Mockup hits return only
// the mockup id + breadcrumbs (the client then calls
// `/api/mockups/[id]/viewer` for the heavy data); folder hits include
// children + mockups inline because the folder view renders the same
// `ProjectContent` grid as the project root.
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const rawPath = url.searchParams.get('path') ?? '';
  const segments = rawPath
    .split('/')
    .map((s) => decodeURIComponent(s))
    .filter((s) => s.length > 0);

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (segments.length === 0) {
    return NextResponse.json({ error: 'invalid_path' }, { status: 400 });
  }

  const resolution = await resolveProjectPath(project.id, segments);
  if (!resolution) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const projectCrumb = {
    label: projectDisplayName(project),
    href: projectHref(project.slug),
  };

  if (resolution.kind === 'mockup') {
    const ancestorCrumbs = resolution.folderPathNames.map((_, i) => {
      const sub = resolution.folderPathNames.slice(0, i + 1);
      return { label: sub[sub.length - 1], href: folderHref(project.slug, sub) };
    });
    return NextResponse.json({
      kind: 'mockup',
      mockupId: resolution.mockupId,
      breadcrumbs: [
        projectCrumb,
        ...ancestorCrumbs,
        {
          label: resolution.mockupName,
          href: mockupSlugHref(project.slug, resolution.folderPathNames, resolution.mockupSlug),
        },
      ],
    });
  }

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
  if (!folder) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const ancestorBreadcrumbs = resolution.pathNames.slice(0, -1).map((_, i) => {
    const subPath = resolution.pathNames.slice(0, i + 1);
    return {
      label: subPath[subPath.length - 1],
      href: folderHref(project.slug, subPath),
    };
  });

  return NextResponse.json({
    kind: 'folder',
    projectName: projectDisplayName(project),
    projectSlug: project.slug,
    projectId: project.id,
    projectIcon: project.icon ?? null,
    folderName: folder.name,
    currentFolderId: folder.id,
    folderPathNames: resolution.pathNames,
    folders: folder.children.map((f) => ({
      id: f.id,
      name: f.name,
      childCount: f._count.children + f._count.mockups,
    })),
    mockups: folder.mockups.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      status: m.status,
      updatedAt: m.updatedAt.toISOString(),
      annotationCount: m._count.annotations,
    })),
    breadcrumbs: [
      projectCrumb,
      ...ancestorBreadcrumbs,
      { label: folder.name, href: folderHref(project.slug, resolution.pathNames) },
    ],
  });
}

export const dynamic = 'force-dynamic';

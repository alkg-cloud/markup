import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { prisma } from '@/lib/prisma';
import { projectDisplayName, projectHref } from '@/lib/project/routes';

// Aggregator for `/projects/[slug]` — returns the project metadata,
// root-level folders + mockups (everything the project landing page
// renders) plus the breadcrumb. The page component (client) calls this
// once and renders the result.
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { slug } = await ctx.params;
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
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    projectName: projectDisplayName(project),
    projectSlug: project.slug,
    projectId: project.id,
    projectIcon: project.icon ?? null,
    folders: project.folders.map((f) => ({
      id: f.id,
      name: f.name,
      childCount: f._count.children + f._count.mockups,
    })),
    mockups: project.mockups.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      status: m.status,
      updatedAt: m.updatedAt.toISOString(),
      annotationCount: m._count.annotations,
    })),
    breadcrumbs: [{ label: projectDisplayName(project), href: projectHref(project.slug) }],
  });
}

export const dynamic = 'force-dynamic';

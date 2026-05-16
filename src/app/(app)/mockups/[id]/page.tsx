import fs from 'node:fs';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/Topbar/Topbar';
import { identify } from '@/lib/auth/identify';
import { resolveDisplayNames } from '@/lib/auth/resolve-display-name';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { env } from '@/lib/env';
import { thumbnailPath } from '@/lib/mockup/storage';
import { prisma } from '@/lib/prisma';
import { MockupViewer } from './MockupViewer';

export default async function MockupViewerPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { id: mockupIdOrSlug } = await params;
  const mockup = await prisma.mockup.findFirst({
    where: /^c[a-z0-9]{24}$/.test(mockupIdOrSlug)
      ? { id: mockupIdOrSlug }
      : { slug: mockupIdOrSlug },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      folder: { select: { id: true, name: true, parentId: true } },
      versions: { orderBy: { createdAt: 'desc' } },
      annotations: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { thread: { include: { _count: { select: { messages: true } } } } },
      },
    },
  });
  if (!mockup?.currentVersionId) {
    return <main style={{ padding: 24 }}>Mockup not found.</main>;
  }
  const hasThumbnail = fs.existsSync(thumbnailPath(env().DATA_DIR, mockup.id));
  const nameMap = await resolveDisplayNames([
    ...mockup.versions.map((v) => ({ createdBy: v.createdBy, createdByType: v.createdByType })),
  ]);

  // Build the topbar breadcrumb: project › ...folder path › mockup
  const breadcrumbs: { label: string; href?: string }[] = [];
  if (mockup.project) {
    breadcrumbs.push({
      label: mockup.project.name,
      href: `/?project=${mockup.project.slug}`,
    });
  }
  if (mockup.folder && mockup.project) {
    // Walk up the folder chain so the breadcrumb shows the full path.
    const chain: { id: string; name: string }[] = [];
    let cursor: { id: string; name: string; parentId: string | null } | null = mockup.folder;
    const guard = new Set<string>();
    while (cursor && !guard.has(cursor.id)) {
      guard.add(cursor.id);
      chain.unshift({ id: cursor.id, name: cursor.name });
      cursor = cursor.parentId
        ? await prisma.folder.findUnique({
            where: { id: cursor.parentId },
            select: { id: true, name: true, parentId: true },
          })
        : null;
    }
    for (const f of chain) {
      breadcrumbs.push({
        label: f.name,
        href: `/?project=${mockup.project.slug}&folder=${f.id}`,
      });
    }
  }
  breadcrumbs.push({ label: mockup.name });

  return (
    <>
      <Topbar breadcrumbs={breadcrumbs} />
      <MockupViewer
        mockupId={mockup.id}
        mockupName={mockup.name}
        currentVersionId={mockup.currentVersionId}
        hasThumbnail={hasThumbnail}
        versions={mockup.versions.map((v) => {
          const resolved = nameMap.get(v.createdBy);
          return {
            id: v.id,
            createdAt: v.createdAt.toISOString(),
            authorName: resolved?.name ?? `${v.createdByType} ${v.createdBy.slice(-6)}`,
            authorKind: (resolved?.kind ?? v.createdByType) as 'user' | 'agent',
          };
        })}
        annotations={mockup.annotations.map((a) => ({
          id: a.id,
          createdAt: a.createdAt.toISOString(),
          screenshotPath: a.screenshotPath,
          threadStatus: a.thread?.status ?? 'open',
          messageCount: a.thread?._count.messages ?? 0,
          pinCoords: a.pinCoords, // raw JSON string; parsed in client
        }))}
      />
    </>
  );
}

export const dynamic = 'force-dynamic';

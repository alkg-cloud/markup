import 'server-only';

import { prisma } from '@/lib/prisma';
import { buildFolderNamePath } from '@/lib/project/path-resolver';
import { mockupSlugHref } from '@/lib/project/routes';

/**
 * Resolve a mockup's canonical path-based URL. Returns `null` when
 * the mockup doesn't exist or isn't attached to a project. The
 * canonical URL is `/projects/<slug>/<folder-path>/<mockup-slug>`;
 * mockups with no folder produce `/projects/<slug>/<mockup-slug>`.
 *
 * Server-only — does Prisma reads to walk the folder chain (reuses
 * `buildFolderNamePath` from the path-resolver).
 */
export async function pathForMockup(mockupId: string): Promise<string | null> {
  const mockup = await prisma.mockup.findUnique({
    where: { id: mockupId },
    select: {
      slug: true,
      folderId: true,
      project: { select: { slug: true } },
    },
  });
  if (!mockup || !mockup.project) return null;
  const folderPath = mockup.folderId ? await buildFolderNamePath(mockup.folderId) : [];
  return mockupSlugHref(mockup.project.slug, folderPath, mockup.slug);
}

import { prisma } from '@/lib/prisma';
import { mockupSlugHref } from '@/lib/project/routes';

/**
 * Resolve a mockup's canonical path-based URL. Returns `null` when
 * the mockup doesn't exist or isn't attached to a project. The
 * canonical URL is `/projects/<slug>/<folder-path>/<mockup-slug>`;
 * mockups with no folder produce `/projects/<slug>/<mockup-slug>`.
 *
 * Server-only — does Prisma reads to walk the folder chain.
 */
export async function pathForMockup(mockupId: string): Promise<string | null> {
  const mockup = await prisma.mockup.findUnique({
    where: { id: mockupId },
    select: {
      slug: true,
      project: { select: { slug: true } },
      folder: { select: { id: true, name: true, parentId: true } },
    },
  });
  if (!mockup || !mockup.project) return null;

  const folderPath: string[] = [];
  let folder = mockup.folder;
  const seen = new Set<string>();
  while (folder) {
    if (seen.has(folder.id)) break;
    seen.add(folder.id);
    folderPath.unshift(folder.name);
    if (!folder.parentId) break;
    const parent: { id: string; name: string; parentId: string | null } | null =
      await prisma.folder.findUnique({
        where: { id: folder.parentId },
        select: { id: true, name: true, parentId: true },
      });
    folder = parent;
  }
  return mockupSlugHref(mockup.project.slug, folderPath, mockup.slug);
}

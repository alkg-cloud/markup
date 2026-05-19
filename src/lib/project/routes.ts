/**
 * Canonical URL helpers for projects + folders.
 *
 * The product uses path-based URLs (not query strings) so each
 * project, folder, and mockup can be linked, bookmarked, and
 * breadcrumbed by a real route. Routes:
 *
 *   /                                         → all-projects landing
 *   /projects                                 → redirect to `/`
 *                                                (kept so external
 *                                                bookmarks resolve)
 *   /projects/<slug>                          → single project
 *   /projects/<slug>/<folder>                 → folder at root of project
 *   /projects/<slug>/<folder>/<sub>           → nested folder
 *   /projects/<slug>/<folder>/<mockup-slug>   → mockup view (resolved
 *                                                by trailing slug)
 *
 * Folder names are URL-encoded per segment (path segments must be
 * encoded with `encodeURIComponent`). The resolver in
 * `src/lib/project/path-resolver.ts` walks the folder tree by name
 * to find the matching folder ID at runtime.
 */

/** Workspace landing — the all-projects grid lives at `/`. */
export function projectsHref(): string {
  return '/';
}

export function projectHref(projectSlug: string): string {
  return `/projects/${encodeURIComponent(projectSlug)}`;
}

/** Build the URL for a folder by its full ancestor-to-self name path. */
export function folderHref(projectSlug: string, folderNames: ReadonlyArray<string>): string {
  if (folderNames.length === 0) return projectHref(projectSlug);
  const segments = folderNames.map((n) => encodeURIComponent(n)).join('/');
  return `/projects/${encodeURIComponent(projectSlug)}/${segments}`;
}

/** Build the URL for a mockup nested under a folder path. */
export function mockupSlugHref(
  projectSlug: string,
  folderNames: ReadonlyArray<string>,
  mockupSlug: string,
): string {
  const folderPart = folderNames.map((n) => encodeURIComponent(n)).join('/');
  const prefix = folderPart ? `${folderPart}/` : '';
  return `/projects/${encodeURIComponent(projectSlug)}/${prefix}${encodeURIComponent(mockupSlug)}`;
}

export function projectDisplayName(project: { slug: string; name: string }): string {
  return project.slug === 'unsorted' ? 'Ungrouped' : project.name;
}

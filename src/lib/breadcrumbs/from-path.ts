import type { BreadcrumbSegment } from '@/components/Breadcrumbs/Breadcrumbs';
import type { TreeProject } from '@/components/ProjectTree/ProjectTree';
import type { RecentMockup } from '@/components/ProjectTree/RecentsSection';
import { folderHref, projectHref } from '@/lib/project/routes';

interface BuildArgs {
  /** Current URL pathname (e.g. `/projects/lumen-coffee/Hero/lumen-coffee-hero`). */
  pathname: string;
  /** Shell's project tree — used to resolve `<slug>` to a project name. */
  projects: TreeProject[];
  /** Shell's mockups indexed by id — used to resolve a trailing mockup slug
   *  to its display name when the user navigates to a mockup URL. */
  recentMockups: Record<string, RecentMockup>;
}

/**
 * Builds a breadcrumb path purely from the URL + the already-loaded
 * shell payload. Used by `AppShell`'s persistent `<Topbar>` so the
 * breadcrumb updates the moment the user clicks a link, no waiting on
 * the page-level resolver round-trip.
 *
 * When a slug isn't in the shell snapshot (e.g. a fresh mockup created
 * elsewhere), the segment label falls back to the raw URL slug — the
 * page's own data fetch will refine it once the shell is refreshed.
 */
export function buildBreadcrumbsFromPath({
  pathname,
  projects,
  recentMockups,
}: BuildArgs): BreadcrumbSegment[] {
  if (!pathname || pathname === '/' || pathname === '') return [];

  const segments = pathname.split('/').filter(Boolean);

  // Settings pages have hand-rolled labels — they're short, two levels,
  // and don't need URL resolution.
  if (segments[0] === 'settings') {
    if (segments[1] === 'agents') return [{ label: 'Agent Tokens' }];
    if (segments[1] === 'invites') return [{ label: 'Invites' }];
    return [{ label: 'Settings' }];
  }

  // Project / folder / mockup tree paths share the same prefix.
  if (segments[0] === 'projects' && segments[1]) {
    const slug = segments[1];
    const tail = segments.slice(2);
    const out: BreadcrumbSegment[] = [];

    if (slug === 'unsorted') {
      out.push({ label: 'Ungrouped', href: '/projects/unsorted' });
    } else {
      const project = projects.find((p) => p.slug === slug);
      out.push({
        label: project?.name ?? slug,
        href: projectHref(slug),
      });
    }

    // Build a slug → name map from recents for the trailing mockup lookup.
    // The recents payload already lists every mockup; we don't need a
    // second round-trip.
    const mockupNameBySlug = new Map<string, string>();
    for (const m of Object.values(recentMockups)) {
      const url = m.href ?? '';
      const slugFromHref = url.split('/').pop();
      if (slugFromHref) mockupNameBySlug.set(slugFromHref, m.name);
    }

    // Walk folder segments and the final mockup segment. The last
    // segment is either a folder (rare leaf — the user can land on a
    // folder URL) or a mockup slug; we treat the mockup-slug case via
    // the slug → name map and fall through to literal-name otherwise.
    for (let i = 0; i < tail.length; i++) {
      const seg = tail[i];
      const isLast = i === tail.length - 1;
      const folderPath = tail.slice(0, i + 1);
      // Mockup slug match wins on the last segment (folders rarely share
      // names with mockup slugs under the same parent).
      if (isLast && mockupNameBySlug.has(seg)) {
        out.push({ label: mockupNameBySlug.get(seg) ?? seg });
        continue;
      }
      out.push({
        label: seg,
        href: isLast ? undefined : folderHref(slug, folderPath),
      });
    }

    return out;
  }

  // Annotation deep links, mockup/diff pages, etc. — fall back to a
  // generic label until those routes register their own resolver.
  return [{ label: segments[segments.length - 1] }];
}

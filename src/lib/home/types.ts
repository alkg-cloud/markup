/**
 * Shared types for the workspace home aggregator (`GET /api/home`).
 *
 * The home page (`/`) consumes `HomeData` directly. Components in
 * `src/components/Home*` accept slices of this payload as their props.
 */

export interface HomeIdentity {
  name: string | null;
  email: string | null;
  role: 'admin' | 'member';
}

export interface HomeGreeting {
  /** Computed server-side from the current `Date.getHours()`. */
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  /** Mockups with `updatedAt > now - 24h`. Hidden client-side when zero. */
  updatedSinceYesterdayCount: number;
}

export interface RecentEntry {
  id: string;
  name: string;
  slug: string;
  status: 'open' | 'resolved' | 'archived';
  /** ISO 8601. */
  updatedAt: string;
  /** Canonical path-based URL, built via `mockupSlugHref(...)`. */
  href: string;
  /** Human-readable breadcrumb: `"Project · Folder · Subfolder"` or `"Ungrouped"`. */
  breadcrumb: string;
  /** cuid of the user who created this mockup, or null for legacy / agent-created rows. */
  createdById: string | null;
}

export interface OrphanEntry {
  id: string;
  name: string;
  slug: string;
  status: 'open' | 'resolved' | 'archived';
  updatedAt: string;
  /** `/projects/unsorted/<mockup-slug>`. */
  href: string;
  /** cuid of the user who created this mockup, or null for legacy / agent-created rows. */
  createdById: string | null;
}

export interface ProjectListEntry {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
  mockupCount: number;
  folderCount: number;
  /** cuid of the user who created this project, or null for legacy rows. */
  createdById: string | null;
}

export interface HomeData {
  identity: HomeIdentity;
  greeting: HomeGreeting;
  /** Top 6 by `updatedAt` desc; cross-project, includes orphans; excludes archived. */
  recents: RecentEntry[];
  /** Same shape as the historical `GET /api/projects` payload. */
  projects: ProjectListEntry[];
  /** All non-archived mockups with `projectId === null`, by `updatedAt` desc. */
  orphans: OrphanEntry[];
}

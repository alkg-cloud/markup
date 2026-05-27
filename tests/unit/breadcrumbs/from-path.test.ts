import { describe, expect, it } from 'vitest';
import type { TreeProject } from '@/components/ProjectTree/ProjectTree';
import type { RecentMockup } from '@/components/ProjectTree/RecentsSection';
import { buildBreadcrumbsFromPath } from '@/lib/breadcrumbs/from-path';

// Minimal fixtures — no I/O, purely structural
const noProjects: TreeProject[] = [];
const noRecents: Record<string, RecentMockup> = {};

const projects: TreeProject[] = [
  {
    id: 'p1',
    name: 'Lumen Coffee',
    slug: 'lumen-coffee',
    icon: null,
    position: 0,
    createdBy: null,
    createdByType: null,
    folders: [],
    mockups: [],
  },
];

const recentMockups: Record<string, RecentMockup> = {
  m1: {
    id: 'm1',
    name: 'Hero Section',
    updatedAt: '2026-01-01T00:00:00Z',
    href: '/projects/lumen-coffee/hero-section',
  },
};

describe('buildBreadcrumbsFromPath', () => {
  // ── Root / empty paths ────────────────────────────────────────────────────
  it('returns [] for pathname "/"', () => {
    expect(
      buildBreadcrumbsFromPath({ pathname: '/', projects: noProjects, recentMockups: noRecents }),
    ).toEqual([]);
  });

  it('returns [] for empty string', () => {
    expect(
      buildBreadcrumbsFromPath({ pathname: '', projects: noProjects, recentMockups: noRecents }),
    ).toEqual([]);
  });

  // ── Settings pages ────────────────────────────────────────────────────────
  it('returns [Settings] for /settings', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/settings',
      projects: noProjects,
      recentMockups: noRecents,
    });
    expect(result).toEqual([{ label: 'Settings' }]);
  });

  it('returns [Agent Tokens] for /settings/agents', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/settings/agents',
      projects: noProjects,
      recentMockups: noRecents,
    });
    expect(result).toEqual([{ label: 'Agent Tokens' }]);
  });

  it('returns [Invites] for /settings/invites', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/settings/invites',
      projects: noProjects,
      recentMockups: noRecents,
    });
    expect(result).toEqual([{ label: 'Invites' }]);
  });

  // Settings sub-path that is not a known sub-route falls back to generic Settings
  it('returns [Settings] for unrecognised /settings/other', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/settings/other',
      projects: noProjects,
      recentMockups: noRecents,
    });
    expect(result).toEqual([{ label: 'Settings' }]);
  });

  // ── Unsorted / ungrouped project ──────────────────────────────────────────
  it('returns [Ungrouped] for /projects/unsorted', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/projects/unsorted',
      projects: noProjects,
      recentMockups: noRecents,
    });
    expect(result).toEqual([{ label: 'Ungrouped', href: '/projects/unsorted' }]);
  });

  // ── Known project — resolved from shell snapshot ──────────────────────────
  it('resolves project name from projects list', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/projects/lumen-coffee',
      projects,
      recentMockups: noRecents,
    });
    expect(result).toEqual([{ label: 'Lumen Coffee', href: '/projects/lumen-coffee' }]);
  });

  // ── Unknown project slug — falls back to slug ─────────────────────────────
  it('falls back to slug when project is not in snapshot', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/projects/unknown-project',
      projects: noProjects,
      recentMockups: noRecents,
    });
    expect(result).toEqual([{ label: 'unknown-project', href: '/projects/unknown-project' }]);
  });

  // ── Mockup slug resolved via recentMockups ────────────────────────────────
  it('resolves trailing mockup slug to its display name', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/projects/lumen-coffee/hero-section',
      projects,
      recentMockups,
    });
    expect(result).toEqual([
      { label: 'Lumen Coffee', href: '/projects/lumen-coffee' },
      { label: 'Hero Section' },
    ]);
  });

  it('falls back to raw slug for unknown mockup on last segment', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/projects/lumen-coffee/unknown-mockup',
      projects,
      recentMockups,
    });
    // not in recentMockups — raw slug rendered without href (last segment)
    expect(result).toEqual([
      { label: 'Lumen Coffee', href: '/projects/lumen-coffee' },
      { label: 'unknown-mockup' },
    ]);
  });

  // ── Folder segments ───────────────────────────────────────────────────────
  it('adds intermediate folder segments with hrefs', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/projects/lumen-coffee/Marketing/hero-section',
      projects,
      recentMockups,
    });
    expect(result).toEqual([
      { label: 'Lumen Coffee', href: '/projects/lumen-coffee' },
      { label: 'Marketing', href: '/projects/lumen-coffee/Marketing' },
      { label: 'Hero Section' },
    ]);
  });

  it('last folder segment has no href (leaf URL)', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/projects/lumen-coffee/Marketing',
      projects,
      recentMockups: noRecents,
    });
    // "Marketing" is the last segment and not in recentMockups
    expect(result).toEqual([
      { label: 'Lumen Coffee', href: '/projects/lumen-coffee' },
      { label: 'Marketing' },
    ]);
  });

  // ── Generic fallback (non-projects, non-settings paths) ───────────────────
  it('returns last segment as label for unrecognised top-level paths', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/m/some-mockup-id',
      projects: noProjects,
      recentMockups: noRecents,
    });
    expect(result).toEqual([{ label: 'some-mockup-id' }]);
  });

  it('returns last segment for deep unknown paths', () => {
    const result = buildBreadcrumbsFromPath({
      pathname: '/diff/abc/def',
      projects: noProjects,
      recentMockups: noRecents,
    });
    expect(result).toEqual([{ label: 'def' }]);
  });
});

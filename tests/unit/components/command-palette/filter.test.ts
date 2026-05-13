import { describe, expect, it } from 'vitest';
import { filterAndGroup } from '@/components/CommandPalette/filter';
import type { FlatSearchItem } from '@/components/CommandPalette/flatten';

const items: FlatSearchItem[] = [
  {
    id: 'p1',
    name: 'Lumen Coffee',
    path: '',
    type: 'project',
    href: '/projects/lumen-coffee',
    projectSlug: 'lumen-coffee',
  },
  {
    id: 'f1',
    name: 'Wireframes',
    path: 'Lumen Coffee',
    type: 'folder',
    href: '/projects/lumen-coffee',
    projectSlug: 'lumen-coffee',
  },
  {
    id: 'm1',
    name: 'Homepage v2',
    path: 'Lumen Coffee / Wireframes',
    type: 'mockup',
    href: '/mockups/m1',
    projectSlug: 'lumen-coffee',
  },
  {
    id: 'p2',
    name: 'Helio Pricing',
    path: '',
    type: 'project',
    href: '/projects/helio-pricing',
    projectSlug: 'helio-pricing',
  },
  {
    id: 'm2',
    name: 'Pricing Cards',
    path: 'Helio Pricing',
    type: 'mockup',
    href: '/mockups/m2',
    projectSlug: 'helio-pricing',
  },
];

describe('filterAndGroup', () => {
  it('returns all items grouped when query is empty', () => {
    const result = filterAndGroup(items, '');
    expect(result.projects).toHaveLength(2);
    expect(result.folders).toHaveLength(1);
    expect(result.mockups).toHaveLength(2);
    expect(result.total).toBe(5);
  });

  it('filters by name (case-insensitive)', () => {
    const result = filterAndGroup(items, 'lumen');
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].id).toBe('p1');
  });

  it('filters by path', () => {
    const result = filterAndGroup(items, 'wireframes');
    expect(result.folders).toHaveLength(1);
    expect(result.mockups).toHaveLength(1);
    expect(result.mockups[0].id).toBe('m1');
  });

  it('returns empty groups when nothing matches', () => {
    const result = filterAndGroup(items, 'zzzznonexistent');
    expect(result.total).toBe(0);
    expect(result.projects).toEqual([]);
    expect(result.folders).toEqual([]);
    expect(result.mockups).toEqual([]);
  });

  it('matches across name and path simultaneously', () => {
    const result = filterAndGroup(items, 'pricing');
    expect(result.projects).toHaveLength(1);
    expect(result.mockups).toHaveLength(1);
  });
});

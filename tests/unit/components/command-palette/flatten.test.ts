import { describe, expect, it } from 'vitest';
import { flattenProjectTree } from '@/components/CommandPalette/flatten';

describe('flattenProjectTree', () => {
  it('returns empty array for empty input', () => {
    expect(flattenProjectTree([])).toEqual([]);
  });

  it('flattens a project with no folders or mockups', () => {
    const input = [
      {
        id: 'p1',
        name: 'Alpha',
        slug: 'alpha',
        icon: null,
        position: 0,
        folders: [],
        mockups: [],
      },
    ];
    const result = flattenProjectTree(input);
    expect(result).toEqual([
      {
        id: 'p1',
        name: 'Alpha',
        path: '',
        type: 'project',
        href: '/projects/alpha',
        projectSlug: 'alpha',
      },
    ]);
  });

  it('flattens root-level mockups under a project', () => {
    const input = [
      {
        id: 'p1',
        name: 'Alpha',
        slug: 'alpha',
        icon: null,
        position: 0,
        folders: [],
        mockups: [
          {
            id: 'm1',
            name: 'Homepage',
            slug: 'homepage',
            status: 'open',
            position: 0,
          },
        ],
      },
    ];
    const result = flattenProjectTree(input);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      id: 'm1',
      name: 'Homepage',
      path: 'Alpha',
      type: 'mockup',
      href: '/mockups/m1',
      projectSlug: 'alpha',
    });
  });

  it('flattens nested folders with correct paths', () => {
    const input = [
      {
        id: 'p1',
        name: 'Alpha',
        slug: 'alpha',
        icon: null,
        position: 0,
        mockups: [],
        folders: [
          {
            id: 'f1',
            name: 'Design',
            position: 0,
            mockups: [
              {
                id: 'm2',
                name: 'Cards',
                slug: 'cards',
                status: 'open',
                position: 0,
              },
            ],
            children: [
              {
                id: 'f2',
                name: 'Icons',
                position: 0,
                mockups: [],
                children: [],
              },
            ],
          },
        ],
      },
    ];
    const result = flattenProjectTree(input);

    const folder1 = result.find((r) => r.id === 'f1')!;
    expect(folder1.path).toBe('Alpha');
    expect(folder1.type).toBe('folder');
    expect(folder1.href).toBe('/projects/alpha');

    const folder2 = result.find((r) => r.id === 'f2')!;
    expect(folder2.path).toBe('Alpha / Design');
    expect(folder2.href).toBe('/projects/alpha');

    const mockup = result.find((r) => r.id === 'm2')!;
    expect(mockup.path).toBe('Alpha / Design');
    expect(mockup.type).toBe('mockup');
    expect(mockup.href).toBe('/mockups/m2');
  });

  it('handles multiple projects', () => {
    const input = [
      {
        id: 'p1',
        name: 'A',
        slug: 'a',
        icon: null,
        position: 0,
        folders: [],
        mockups: [],
      },
      {
        id: 'p2',
        name: 'B',
        slug: 'b',
        icon: null,
        position: 1,
        folders: [],
        mockups: [],
      },
    ];
    const result = flattenProjectTree(input);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('p1');
    expect(result[1].id).toBe('p2');
  });
});

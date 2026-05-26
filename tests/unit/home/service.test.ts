import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHomeData } from '@/lib/home/service';
import type { HomeIdentity } from '@/lib/home/types';

// ---------------------------------------------------------------------------
// In-memory fixture state. The mocks below read from `state.*` so each test
// can mutate the seed before calling `getHomeData()` without re-mocking.
// ---------------------------------------------------------------------------

interface MockupRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  updatedAt: Date;
  projectId: string | null;
  folderId: string | null;
  createdBy: string | null;
  createdByType: 'user' | 'agent' | null;
}

interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  mockupCount: number;
  folderCount: number;
  createdBy: string | null;
  createdByType: 'user' | 'agent' | null;
}

interface FolderRow {
  id: string;
  name: string;
  parentId: string | null;
  projectId: string;
}

const state: {
  mockups: MockupRow[];
  projects: ProjectRow[];
  folders: FolderRow[];
} = {
  mockups: [],
  projects: [],
  folders: [],
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    mockup: {
      findMany: vi.fn(
        async ({
          where,
          orderBy,
        }: {
          where?: { status?: { not?: string } };
          orderBy?: { updatedAt?: 'asc' | 'desc' };
        }) => {
          let rows = state.mockups.slice();
          if (where?.status?.not) {
            const banned = where.status.not;
            rows = rows.filter((m) => m.status !== banned);
          }
          if (orderBy?.updatedAt === 'desc') {
            rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
          } else if (orderBy?.updatedAt === 'asc') {
            rows.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
          }
          return rows;
        },
      ),
      count: vi.fn(async ({ where }: { where?: { updatedAt?: { gt?: Date } } }) => {
        const gt = where?.updatedAt?.gt;
        if (!gt) return state.mockups.length;
        return state.mockups.filter((m) => m.updatedAt.getTime() > gt.getTime()).length;
      }),
    },
    folder: {
      findMany: vi.fn(async () => state.folders.map((f) => ({ ...f }))),
    },
  },
}));

vi.mock('@/lib/project/service', () => ({
  listProjects: vi.fn(async () => state.projects.map((p) => ({ ...p }))),
}));

const IDENTITY: HomeIdentity = { name: 'Tester', email: 't@x.com', role: 'admin' };

function reset() {
  state.mockups = [];
  state.projects = [];
  state.folders = [];
}

function addProject(input: Partial<ProjectRow> & { id: string; name: string; slug: string }) {
  state.projects.push({
    icon: null,
    position: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    mockupCount: 0,
    folderCount: 0,
    createdBy: null,
    createdByType: null,
    ...input,
  });
}

function addFolder(input: FolderRow) {
  state.folders.push(input);
}

function addMockup(
  input: Partial<MockupRow> & { id: string; name: string; slug: string; updatedAt: Date },
) {
  state.mockups.push({
    status: 'open',
    projectId: null,
    folderId: null,
    createdBy: null,
    createdByType: null,
    ...input,
  });
}

beforeEach(() => {
  reset();
});

describe('getHomeData', () => {
  it('returns the passed-in identity snapshot verbatim and computes greeting fields', async () => {
    const data = await getHomeData(IDENTITY);
    expect(data.identity).toEqual(IDENTITY);
    expect(['morning', 'afternoon', 'evening']).toContain(data.greeting.timeOfDay);
    expect(typeof data.greeting.updatedSinceYesterdayCount).toBe('number');
    expect(data.recents).toEqual([]);
    expect(data.projects).toEqual([]);
    expect(data.orphans).toEqual([]);
  });

  it('orders recents by updatedAt desc and caps at 6', async () => {
    addProject({ id: 'p1', name: 'Alpha', slug: 'alpha' });
    // Seed 8 mockups with strictly decreasing updatedAt; service should keep
    // the 6 most recent and preserve descending order.
    for (let i = 0; i < 8; i++) {
      addMockup({
        id: `m${i}`,
        name: `Mock ${i}`,
        slug: `mock-${i}`,
        // Newer index = older timestamp so m0 is newest.
        updatedAt: new Date(2026, 4, 20 - i, 12, 0, 0),
        projectId: 'p1',
      });
    }
    const data = await getHomeData(IDENTITY);
    expect(data.recents).toHaveLength(6);
    expect(data.recents.map((r) => r.id)).toEqual(['m0', 'm1', 'm2', 'm3', 'm4', 'm5']);
    // Strictly descending updatedAt.
    for (let i = 0; i < data.recents.length - 1; i++) {
      expect(new Date(data.recents[i].updatedAt).getTime()).toBeGreaterThan(
        new Date(data.recents[i + 1].updatedAt).getTime(),
      );
    }
  });

  it('excludes archived mockups from recents and orphans', async () => {
    addProject({ id: 'p1', name: 'Alpha', slug: 'alpha' });
    addMockup({
      id: 'live',
      name: 'Live',
      slug: 'live',
      updatedAt: new Date('2026-05-20T10:00:00Z'),
      projectId: 'p1',
    });
    addMockup({
      id: 'archived',
      name: 'Archived',
      slug: 'archived-m',
      status: 'archived',
      updatedAt: new Date('2026-05-20T11:00:00Z'),
      projectId: 'p1',
    });
    addMockup({
      id: 'archived-orphan',
      name: 'Archived Orphan',
      slug: 'archived-orphan',
      status: 'archived',
      updatedAt: new Date('2026-05-20T12:00:00Z'),
      projectId: null,
    });
    const data = await getHomeData(IDENTITY);
    expect(data.recents.map((r) => r.id)).toEqual(['live']);
    expect(data.orphans).toEqual([]);
  });

  it('builds breadcrumbs: Project · Folder · Subfolder for nested mockups', async () => {
    addProject({ id: 'p1', name: 'Helio', slug: 'helio' });
    addFolder({ id: 'f-mkt', name: 'Marketing', parentId: null, projectId: 'p1' });
    addFolder({ id: 'f-q3', name: 'Q3', parentId: 'f-mkt', projectId: 'p1' });
    addMockup({
      id: 'm-nested',
      name: 'Nested',
      slug: 'nested',
      updatedAt: new Date('2026-05-20T12:00:00Z'),
      projectId: 'p1',
      folderId: 'f-q3',
    });
    const data = await getHomeData(IDENTITY);
    expect(data.recents).toHaveLength(1);
    expect(data.recents[0].breadcrumb).toBe('Helio · Marketing · Q3');
    expect(data.recents[0].href).toBe('/projects/helio/Marketing/Q3/nested');
  });

  it('uses just the project name as breadcrumb for a project-root mockup', async () => {
    addProject({ id: 'p1', name: 'Alpha', slug: 'alpha' });
    addMockup({
      id: 'm-root',
      name: 'Root',
      slug: 'root',
      updatedAt: new Date('2026-05-20T12:00:00Z'),
      projectId: 'p1',
    });
    const data = await getHomeData(IDENTITY);
    expect(data.recents[0].breadcrumb).toBe('Alpha');
    expect(data.recents[0].href).toBe('/projects/alpha/root');
  });

  it('renders Ungrouped breadcrumb for orphan mockups (no project) and surfaces them in orphans[]', async () => {
    addMockup({
      id: 'm-orphan',
      name: 'Orphan',
      slug: 'orphan',
      updatedAt: new Date('2026-05-20T12:00:00Z'),
      projectId: null,
    });
    const data = await getHomeData(IDENTITY);
    expect(data.recents).toHaveLength(1);
    expect(data.recents[0].breadcrumb).toBe('Ungrouped');
    expect(data.orphans).toHaveLength(1);
    expect(data.orphans[0]).toMatchObject({
      id: 'm-orphan',
      slug: 'orphan',
      href: '/projects/unsorted/orphan',
    });
  });

  it('also renders Ungrouped for mockups attached to the synthetic `unsorted` project', async () => {
    addProject({ id: 'p-unsorted', name: 'Unsorted', slug: 'unsorted' });
    addMockup({
      id: 'm-u',
      name: 'U',
      slug: 'u',
      updatedAt: new Date('2026-05-20T12:00:00Z'),
      projectId: 'p-unsorted',
    });
    const data = await getHomeData(IDENTITY);
    expect(data.recents[0].breadcrumb).toBe('Ungrouped');
  });

  it('greeting.updatedSinceYesterdayCount counts only mockups updated in the last 24h', async () => {
    const now = Date.now();
    addMockup({
      id: 'recent-1',
      name: 'r1',
      slug: 'r1',
      updatedAt: new Date(now - 1 * 60 * 60 * 1000), // 1h ago
    });
    addMockup({
      id: 'recent-2',
      name: 'r2',
      slug: 'r2',
      updatedAt: new Date(now - 23 * 60 * 60 * 1000), // 23h ago
    });
    addMockup({
      id: 'old',
      name: 'old',
      slug: 'old',
      updatedAt: new Date(now - 48 * 60 * 60 * 1000), // 48h ago
    });
    const data = await getHomeData(IDENTITY);
    expect(data.greeting.updatedSinceYesterdayCount).toBe(2);
  });

  it('forwards project list with ISO dates and flattened counts', async () => {
    addProject({
      id: 'p1',
      name: 'Alpha',
      slug: 'alpha',
      icon: 'emoji:🚀',
      position: 1024,
      createdAt: new Date('2026-04-01T00:00:00Z'),
      updatedAt: new Date('2026-05-01T00:00:00Z'),
      mockupCount: 3,
      folderCount: 2,
    });
    const data = await getHomeData(IDENTITY);
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0]).toEqual({
      id: 'p1',
      name: 'Alpha',
      slug: 'alpha',
      icon: 'emoji:🚀',
      position: 1024,
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      mockupCount: 3,
      folderCount: 2,
      createdBy: null,
      createdByType: null,
      createdByName: null,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFolderNamePath, resolveProjectPath } from '@/lib/project/path-resolver';

// ---------------------------------------------------------------------------
// Prisma mock — folder.findFirst, folder.findUnique, mockup.findFirst
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  prisma: {
    folder: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    mockup: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const folderFindFirst = vi.mocked(prisma.folder.findFirst);
const folderFindUnique = vi.mocked(prisma.folder.findUnique);
const mockupFindFirst = vi.mocked(prisma.mockup.findFirst);

// ---------------------------------------------------------------------------
// Synthetic fixture helpers
// ---------------------------------------------------------------------------

interface FolderRow {
  id: string;
  name: string;
  parentId: string | null;
  projectId: string;
}

interface MockupRow {
  id: string;
  name: string;
  slug: string;
  folderId: string | null;
  projectId: string;
}

/** Build a simple in-memory folder tree so tests don't have to spell out every mock call. */
function buildFolderMock(folders: FolderRow[], mockups: MockupRow[] = []) {
  // folder.findFirst({ where: { projectId, parentId, name } }) → match or null
  folderFindFirst.mockImplementation(async (args: unknown) => {
    const { where } = args as {
      where: { projectId: string; parentId: string | null; name: string };
    };
    const match = folders.find(
      (f) =>
        f.projectId === where.projectId &&
        f.parentId === (where.parentId ?? null) &&
        f.name === where.name,
    );
    return match ? { id: match.id, name: match.name } : null;
  });

  // folder.findUnique({ where: { id } }) → folder row or null
  folderFindUnique.mockImplementation(async (args: unknown) => {
    const { where } = args as { where: { id: string } };
    const match = folders.find((f) => f.id === where.id);
    return match ? { id: match.id, name: match.name, parentId: match.parentId } : null;
  });

  // mockup.findFirst({ where: { projectId, folderId, slug } }) → match or null
  mockupFindFirst.mockImplementation(async (args: unknown) => {
    const { where } = args as {
      where: { projectId: string; folderId: string | null; slug: string };
    };
    const match = mockups.find(
      (m) =>
        m.projectId === where.projectId &&
        (m.folderId ?? null) === (where.folderId ?? null) &&
        m.slug === where.slug,
    );
    return match
      ? { id: match.id, slug: match.slug, name: match.name, folderId: match.folderId }
      : null;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// resolveProjectPath
// ---------------------------------------------------------------------------

describe('resolveProjectPath — empty path', () => {
  it('returns null for an empty segment array', async () => {
    const result = await resolveProjectPath('proj1', []);
    expect(result).toBeNull();
  });
});

describe('resolveProjectPath — single segment, folder match', () => {
  it('returns folder resolution when segment matches a top-level folder name', async () => {
    buildFolderMock([{ id: 'f1', name: 'Design', parentId: null, projectId: 'proj1' }]);

    const result = await resolveProjectPath('proj1', ['Design']);
    expect(result).toEqual({
      kind: 'folder',
      folderId: 'f1',
      folderName: 'Design',
      pathNames: ['Design'],
    });
  });
});

describe('resolveProjectPath — single segment, mockup match', () => {
  it('returns mockup resolution when segment matches a top-level mockup slug', async () => {
    buildFolderMock(
      [], // no folders
      [
        {
          id: 'm1',
          name: 'Landing Page',
          slug: 'landing-page',
          folderId: null,
          projectId: 'proj1',
        },
      ],
    );

    const result = await resolveProjectPath('proj1', ['landing-page']);
    expect(result).toEqual({
      kind: 'mockup',
      mockupId: 'm1',
      mockupSlug: 'landing-page',
      mockupName: 'Landing Page',
      folderId: null,
      folderPathNames: [],
    });
  });
});

describe('resolveProjectPath — tie-breaking: folder slug == mockup slug', () => {
  it('returns folder (folders win the tie) when both a folder and a mockup share the same name/slug', async () => {
    // A folder named "hero" and a mockup slugged "hero" both exist at the project root.
    buildFolderMock(
      [{ id: 'f-hero', name: 'hero', parentId: null, projectId: 'proj1' }],
      [{ id: 'm-hero', name: 'Hero Mockup', slug: 'hero', folderId: null, projectId: 'proj1' }],
    );

    const result = await resolveProjectPath('proj1', ['hero']);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('folder');
    expect(result).toMatchObject({ kind: 'folder', folderId: 'f-hero' });
    // Mockup lookup should never have been reached.
    expect(mockupFindFirst).not.toHaveBeenCalled();
  });
});

describe('resolveProjectPath — nested path: folder/subfolder/mockup', () => {
  it('resolves a three-segment path to a nested mockup', async () => {
    buildFolderMock(
      [
        { id: 'f-mkt', name: 'Marketing', parentId: null, projectId: 'proj1' },
        { id: 'f-q3', name: 'Q3', parentId: 'f-mkt', projectId: 'proj1' },
      ],
      [
        {
          id: 'm-hero',
          name: 'Hero Banner',
          slug: 'hero-banner',
          folderId: 'f-q3',
          projectId: 'proj1',
        },
      ],
    );

    const result = await resolveProjectPath('proj1', ['Marketing', 'Q3', 'hero-banner']);
    expect(result).toEqual({
      kind: 'mockup',
      mockupId: 'm-hero',
      mockupSlug: 'hero-banner',
      mockupName: 'Hero Banner',
      folderId: 'f-q3',
      folderPathNames: ['Marketing', 'Q3'],
    });
  });

  it('resolves a two-segment path to a folder inside another folder', async () => {
    buildFolderMock([
      { id: 'f-mkt', name: 'Marketing', parentId: null, projectId: 'proj1' },
      { id: 'f-q3', name: 'Q3', parentId: 'f-mkt', projectId: 'proj1' },
    ]);

    const result = await resolveProjectPath('proj1', ['Marketing', 'Q3']);
    expect(result).toEqual({
      kind: 'folder',
      folderId: 'f-q3',
      folderName: 'Q3',
      pathNames: ['Marketing', 'Q3'],
    });
  });
});

describe('resolveProjectPath — unknown last segment', () => {
  it('returns null when the last segment matches neither a folder nor a mockup', async () => {
    buildFolderMock(
      [{ id: 'f1', name: 'Design', parentId: null, projectId: 'proj1' }],
      [], // no mockups
    );

    const result = await resolveProjectPath('proj1', ['Design', 'nonexistent']);
    expect(result).toBeNull();
  });

  it('returns null when a non-last segment is not a folder', async () => {
    buildFolderMock([], []);

    // "ghost" is not a folder, so the walk must terminate immediately.
    const result = await resolveProjectPath('proj1', ['ghost', 'landing-page']);
    expect(result).toBeNull();
    // mockup should not be checked since the failure occurs on a non-last segment
    expect(mockupFindFirst).not.toHaveBeenCalled();
  });
});

describe('resolveProjectPath — URL decoding', () => {
  it('does NOT decode percent-encoded segments (caller / Next.js decodes first)', async () => {
    // The function doc states "segments come pre-decoded". If a caller passes
    // still-encoded segments, the raw string is matched as-is — it won't find
    // a folder named "My Folder" when given "My%20Folder".
    buildFolderMock([{ id: 'f-myf', name: 'My Folder', parentId: null, projectId: 'proj1' }]);

    // Pass the still-encoded form — should NOT match.
    const encodedResult = await resolveProjectPath('proj1', ['My%20Folder']);
    expect(encodedResult).toBeNull();

    // But the decoded form should match.
    vi.clearAllMocks();
    buildFolderMock([{ id: 'f-myf', name: 'My Folder', parentId: null, projectId: 'proj1' }]);
    const decodedResult = await resolveProjectPath('proj1', ['My Folder']);
    expect(decodedResult).not.toBeNull();
    expect(decodedResult?.kind).toBe('folder');
  });
});

// ---------------------------------------------------------------------------
// buildFolderNamePath
// ---------------------------------------------------------------------------

describe('buildFolderNamePath', () => {
  it('returns a single-element array for a root-level folder', async () => {
    buildFolderMock([{ id: 'f-root', name: 'Marketing', parentId: null, projectId: 'proj1' }]);

    const path = await buildFolderNamePath('f-root');
    expect(path).toEqual(['Marketing']);
  });

  it('returns ancestor names in root-to-self order for a nested folder', async () => {
    buildFolderMock([
      { id: 'f-mkt', name: 'Marketing', parentId: null, projectId: 'proj1' },
      { id: 'f-q3', name: 'Q3', parentId: 'f-mkt', projectId: 'proj1' },
      { id: 'f-ads', name: 'Ads', parentId: 'f-q3', projectId: 'proj1' },
    ]);

    const path = await buildFolderNamePath('f-ads');
    expect(path).toEqual(['Marketing', 'Q3', 'Ads']);
  });

  it('returns empty array when folderId does not exist', async () => {
    buildFolderMock([]); // no folders at all

    const path = await buildFolderNamePath('nonexistent');
    expect(path).toEqual([]);
  });

  it('guards against cycles by stopping when a folder id is revisited', async () => {
    // Intentionally malformed tree: f1 → f2 → f1 (cycle).
    folderFindUnique.mockImplementation(async (args: unknown) => {
      const { where } = args as { where: { id: string } };
      if (where.id === 'f1') return { id: 'f1', name: 'A', parentId: 'f2' };
      if (where.id === 'f2') return { id: 'f2', name: 'B', parentId: 'f1' };
      return null;
    });

    // Should terminate rather than loop forever.
    const path = await buildFolderNamePath('f1');
    // The exact names depend on traversal order; just assert it terminates and
    // returns a finite list.
    expect(Array.isArray(path)).toBe(true);
    expect(path.length).toBeLessThanOrEqual(2);
  });
});

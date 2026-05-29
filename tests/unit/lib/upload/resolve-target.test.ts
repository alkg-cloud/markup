import { describe, expect, it } from 'vitest';
import { resolveTargetFromPath } from '@/lib/upload/resolve-target';

describe('resolveTargetFromPath', () => {
  it('returns null for null or empty pathname', () => {
    expect(resolveTargetFromPath(null)).toBeNull();
    expect(resolveTargetFromPath('')).toBeNull();
  });

  it('returns Unsorted at the root path', () => {
    expect(resolveTargetFromPath('/')).toEqual({
      projectId: null,
      folderId: null,
      projectLabel: 'Unsorted',
      folderPath: [],
    });
  });

  it('returns null for unrelated paths', () => {
    expect(resolveTargetFromPath('/settings/agents')).toBeNull();
    expect(resolveTargetFromPath('/login')).toBeNull();
    expect(resolveTargetFromPath('/mockups/abc')).toBeNull();
  });

  it('resolves a project root path', () => {
    expect(resolveTargetFromPath('/projects/lumen-coffee')).toEqual({
      projectId: null,
      folderId: null,
      projectLabel: 'lumen-coffee',
      folderPath: [],
    });
  });

  it('resolves project + folder breadcrumb path', () => {
    expect(resolveTargetFromPath('/projects/lumen-coffee/Hero/v3')).toEqual({
      projectId: null,
      folderId: null,
      projectLabel: 'lumen-coffee',
      folderPath: ['Hero', 'v3'],
    });
  });

  it('decodes URL-encoded slug and segments', () => {
    expect(resolveTargetFromPath('/projects/lumen%20coffee/Hero%20Section/v3')).toEqual({
      projectId: null,
      folderId: null,
      projectLabel: 'lumen coffee',
      folderPath: ['Hero Section', 'v3'],
    });
  });

  it('drops empty segments from the folder path', () => {
    expect(resolveTargetFromPath('/projects/lumen-coffee/Hero//')).toEqual({
      projectId: null,
      folderId: null,
      projectLabel: 'lumen-coffee',
      folderPath: ['Hero'],
    });
  });

  it('handles trailing slash with no tail', () => {
    expect(resolveTargetFromPath('/projects/lumen-coffee/')).toEqual({
      projectId: null,
      folderId: null,
      projectLabel: 'lumen-coffee',
      folderPath: [],
    });
  });
});

import { describe, expect, it } from 'vitest';
import { projectDisplayName, projectHref } from '@/lib/project/routes';

describe('project route helpers', () => {
  it('routes project roots through / with project query', () => {
    expect(projectHref('alpha')).toBe('/?project=alpha');
  });

  it('routes folders through / with project and folder query', () => {
    expect(projectHref('alpha', 'folder-1')).toBe('/?project=alpha&folder=folder-1');
  });

  it('uses Ungrouped as the user-facing name for the legacy unsorted project', () => {
    expect(projectDisplayName({ slug: 'unsorted', name: 'Unsorted' })).toBe('Ungrouped');
    expect(projectDisplayName({ slug: 'alpha', name: 'Alpha' })).toBe('Alpha');
  });
});

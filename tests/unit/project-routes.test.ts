import { describe, expect, it } from 'vitest';
import {
  folderHref,
  mockupSlugHref,
  projectDisplayName,
  projectHref,
  projectsHref,
} from '@/lib/project/routes';

describe('project route helpers', () => {
  it('routes the workspace landing through `/` (the all-projects grid)', () => {
    expect(projectsHref()).toBe('/');
  });

  it('routes a project to /projects/<slug>', () => {
    expect(projectHref('alpha')).toBe('/projects/alpha');
  });

  it('folderHref(slug, []) collapses to the project root', () => {
    expect(folderHref('alpha', [])).toBe('/projects/alpha');
  });

  it('folderHref encodes each folder segment under the project slug', () => {
    expect(folderHref('alpha', ['Design System'])).toBe('/projects/alpha/Design%20System');
    expect(folderHref('alpha', ['Design System', 'Tokens'])).toBe(
      '/projects/alpha/Design%20System/Tokens',
    );
  });

  it('mockupSlugHref places the mockup slug as the trailing segment', () => {
    expect(mockupSlugHref('alpha', [], 'hero')).toBe('/projects/alpha/hero');
    expect(mockupSlugHref('alpha', ['Hero'], 'helio-pricing')).toBe(
      '/projects/alpha/Hero/helio-pricing',
    );
  });

  it('renders the user-facing Ungrouped name for the synthetic unsorted project', () => {
    expect(projectDisplayName({ slug: 'unsorted', name: 'Unsorted' })).toBe('Ungrouped');
    expect(projectDisplayName({ slug: 'alpha', name: 'Alpha' })).toBe('Alpha');
  });
});

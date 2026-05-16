// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const fixtureProjects = [
  {
    id: 'p1',
    name: 'Project Alpha',
    slug: 'project-alpha',
    icon: null,
    position: 1,
    folders: [],
    mockups: [],
  },
];

const fixtureOrphans = [
  { id: 'm1', name: 'Draft sketch', slug: 'draft-sketch', status: 'active', position: 1 },
];

describe('ProjectTree section headers', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    document.body.innerHTML = '';
  });

  it("renders 'PROJECTS' header above the project list", async () => {
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    await act(async () => {
      root.render(
        createElement(ProjectTree, {
          projects: fixtureProjects,
          orphanMockups: fixtureOrphans,
        }),
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('PROJECTS');
  });

  it("renders 'NO PROJECT' header above orphan mockups", async () => {
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    await act(async () => {
      root.render(
        createElement(ProjectTree, {
          projects: fixtureProjects,
          orphanMockups: fixtureOrphans,
        }),
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('NO PROJECT');
  });

  it("renders 'NO PROJECT' after the projects (DOM order)", async () => {
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    await act(async () => {
      root.render(
        createElement(ProjectTree, {
          projects: fixtureProjects,
          orphanMockups: fixtureOrphans,
        }),
      );
    });

    const allText = container.innerHTML;
    const projectsPos = allText.indexOf('PROJECTS');
    const orphanPos = allText.indexOf('NO PROJECT');
    expect(projectsPos).toBeGreaterThanOrEqual(0);
    expect(orphanPos).toBeGreaterThan(projectsPos);
  });

  it("does not render 'NO PROJECT' when orphanMockups is empty", async () => {
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    await act(async () => {
      root.render(
        createElement(ProjectTree, {
          projects: fixtureProjects,
          orphanMockups: [],
        }),
      );
    });

    const text = container.textContent ?? '';
    expect(text).not.toContain('NO PROJECT');
  });
});

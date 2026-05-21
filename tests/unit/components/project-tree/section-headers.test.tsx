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
    createdById: null,
    folders: [],
    mockups: [],
  },
];

const fixtureOrphans = [
  {
    id: 'm1',
    name: 'Draft sketch',
    slug: 'draft-sketch',
    status: 'active',
    position: 1,
    createdById: null,
  },
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

  // The "PROJECTS" label is rendered by ProjectSidebar (`projectsInlineLabel`),
  // not the tree itself — the tree is one of two contexts the inline label
  // sits above. ProjectTree-only contract: it does NOT render its own
  // "PROJECTS" header.
  it("does not render a 'PROJECTS' header (owned by the sidebar wrapper)", async () => {
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
    expect(text).not.toContain('PROJECTS');
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

  it("renders 'NO PROJECT' after the project rows (DOM order)", async () => {
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
    const projectPos = allText.indexOf('Project Alpha');
    const orphanPos = allText.indexOf('NO PROJECT');
    expect(projectPos).toBeGreaterThanOrEqual(0);
    expect(orphanPos).toBeGreaterThan(projectPos);
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

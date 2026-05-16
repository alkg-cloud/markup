// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe('orphan group label', () => {
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

  it("does not render 'Ungrouped' or 'Unsorted' anywhere in the tree", async () => {
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    const orphanMockups = [
      { id: 'm1', name: 'Draft sketch', slug: 'draft-sketch', status: 'active', position: 1 },
    ];

    await act(async () => {
      root.render(
        createElement(ProjectTree, {
          projects: [],
          orphanMockups,
        }),
      );
    });

    expect(container.textContent).not.toContain('Ungrouped');
    expect(container.textContent).not.toContain('Unsorted');
    expect(container.textContent).toContain('Draft sketch');
  });

  it("does not render 'Ungrouped' when unsorted project is absent from projects list", async () => {
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    const realProjects = [
      {
        id: 'p1',
        name: 'My App',
        slug: 'my-app',
        icon: null,
        position: 1,
        folders: [],
        mockups: [],
      },
    ];
    const orphanMockups = [
      { id: 'm1', name: 'Draft sketch', slug: 'draft-sketch', status: 'active', position: 1 },
    ];

    await act(async () => {
      root.render(
        createElement(ProjectTree, {
          projects: realProjects,
          orphanMockups,
        }),
      );
    });

    expect(container.textContent).not.toContain('Ungrouped');
    expect(container.textContent).not.toContain('Unsorted');
    expect(container.textContent).toContain('My App');
    expect(container.textContent).toContain('Draft sketch');
  });
});

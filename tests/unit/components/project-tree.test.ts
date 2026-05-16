// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockPathname = '/';
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function makeProjects() {
  return [
    {
      id: 'p-alpha',
      name: 'Alpha',
      slug: 'alpha',
      icon: null,
      position: 1,
      folders: [
        {
          id: 'f-outer',
          name: 'Outer',
          position: 1,
          children: [
            {
              id: 'f-inner',
              name: 'Inner',
              position: 1,
              children: [],
              mockups: [
                {
                  id: 'm-deep',
                  name: 'Deep Mockup',
                  slug: 'deep-mockup',
                  status: 'active',
                  position: 1,
                },
              ],
            },
          ],
          mockups: [],
        },
      ],
      mockups: [
        {
          id: 'm-root',
          name: 'Root Mockup',
          slug: 'root-mockup',
          status: 'active',
          position: 2,
        },
      ],
    },
    {
      id: 'p-beta',
      name: 'Beta',
      slug: 'beta',
      icon: null,
      position: 2,
      folders: [],
      mockups: [],
    },
  ];
}

function ariaExpanded(container: HTMLElement, title: string): string | null {
  const el = container.querySelector(`[title="${title}"]`);
  return el?.getAttribute('aria-expanded') ?? null;
}

describe('ProjectTree active-path auto-expand', () => {
  beforeEach(() => {
    mockPathname = '/';
    mockSearchParams = new URLSearchParams();
    localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('expands every ancestor when pathname is /mockups/<id> deep in folders', async () => {
    mockPathname = '/mockups/m-deep';
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(ProjectTree, { projects: makeProjects() }));
    });

    expect(ariaExpanded(container, 'Alpha')).toBe('true');
    expect(ariaExpanded(container, 'Outer')).toBe('true');
    expect(ariaExpanded(container, 'Inner')).toBe('true');
    expect(ariaExpanded(container, 'Beta')).toBe('false');

    await act(async () => {
      root.unmount();
    });
  });

  it('resolves mockups by slug as well as id in the pathname', async () => {
    mockPathname = '/mockups/deep-mockup';
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(ProjectTree, { projects: makeProjects() }));
    });

    expect(ariaExpanded(container, 'Alpha')).toBe('true');
    expect(ariaExpanded(container, 'Outer')).toBe('true');
    expect(ariaExpanded(container, 'Inner')).toBe('true');

    await act(async () => {
      root.unmount();
    });
  });

  it('expands only the project when the active mockup lives at project root', async () => {
    mockPathname = '/mockups/m-root';
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(ProjectTree, { projects: makeProjects() }));
    });

    expect(ariaExpanded(container, 'Alpha')).toBe('true');
    expect(ariaExpanded(container, 'Outer')).toBe('false');
    expect(ariaExpanded(container, 'Beta')).toBe('false');

    await act(async () => {
      root.unmount();
    });
  });

  it('expands project + ancestor folders when viewing /?project=slug&folder=id', async () => {
    mockPathname = '/';
    mockSearchParams = new URLSearchParams({ project: 'alpha', folder: 'f-inner' });
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(ProjectTree, { projects: makeProjects() }));
    });

    expect(ariaExpanded(container, 'Alpha')).toBe('true');
    expect(ariaExpanded(container, 'Outer')).toBe('true');
    expect(ariaExpanded(container, 'Inner')).toBe('false');
    expect(ariaExpanded(container, 'Beta')).toBe('false');

    await act(async () => {
      root.unmount();
    });
  });

  it('falls back to expanding the first project when no active path is matched', async () => {
    mockPathname = '/settings/agents';
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(ProjectTree, { projects: makeProjects() }));
    });

    expect(ariaExpanded(container, 'Alpha')).toBe('true');
    expect(ariaExpanded(container, 'Beta')).toBe('false');

    await act(async () => {
      root.unmount();
    });
  });
});

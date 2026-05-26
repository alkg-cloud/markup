// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const STORAGE_KEY = 'markup.sidebar.expanded';

const project = {
  id: 'p1',
  name: 'Project Alpha',
  slug: 'alpha',
  icon: 'emoji:🎨',
  position: 1,
  createdBy: null,
  createdByType: null,
  folders: [],
  mockups: [],
};

describe('tree expansion persistence', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    document.body.innerHTML = '';
  });

  it('reads initial expansion from localStorage on mount', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['p1']));
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    await act(async () => {
      root.render(createElement(ProjectTree, { projects: [project], orphanMockups: [] }));
    });
    const node = container.querySelector('[title="Project Alpha"]');
    expect(node?.getAttribute('aria-expanded')).toBe('true');
  });

  it('writes to localStorage when expansion state changes', async () => {
    // Pre-expand via localStorage so we can then collapse and verify write
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['p1']));
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');
    await act(async () => {
      root.render(createElement(ProjectTree, { projects: [project], orphanMockups: [] }));
    });

    // Project should be expanded due to persisted state
    const node = container.querySelector('[title="Project Alpha"]') as HTMLElement | null;
    expect(node?.getAttribute('aria-expanded')).toBe('true');

    // Click to collapse
    await act(async () => {
      node?.click();
    });

    // localStorage should be updated (p1 removed after collapse)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '["p1"]');
    expect(stored).not.toContain('p1');
  });
});

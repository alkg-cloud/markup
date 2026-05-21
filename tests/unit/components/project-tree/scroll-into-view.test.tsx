// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mutable references so we can change pathname between renders.
let mockPathname = '/';
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const project = {
  id: 'p1',
  name: 'Project Alpha',
  slug: 'alpha',
  icon: 'emoji:🎨',
  position: 1,
  createdById: null,
  folders: [],
  mockups: [
    { id: 'm1', name: 'Mockup1', slug: 'm1', status: 'active', position: 1, createdById: null },
  ],
};

describe('active node scrollIntoView', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let spy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    spy = vi.fn();
    Element.prototype.scrollIntoView = spy as unknown as Element['scrollIntoView'];
    localStorage.clear();
    // Pre-expand the project so the mockup treeitem is visible.
    localStorage.setItem('markup.sidebar.expanded', JSON.stringify(['p1']));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    // Start with no active URL.
    mockPathname = '/';
    mockSearchParams = new URLSearchParams();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    document.body.innerHTML = '';
  });

  it('calls scrollIntoView on the active treeitem when pathname changes to a mockup URL', async () => {
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');

    // Initial render: pathname='/', no active treeitem matches so no scroll expected.
    await act(async () => {
      root.render(createElement(ProjectTree, { projects: [project], orphanMockups: [] }));
    });

    spy.mockClear();

    // Navigate to the path-based mockup URL.
    mockPathname = '/projects/alpha/m1';
    await act(async () => {
      root.render(createElement(ProjectTree, { projects: [project], orphanMockups: [] }));
    });

    expect(spy).toHaveBeenCalled();
    const callArg = spy.mock.calls[spy.mock.calls.length - 1][0];
    expect(callArg).toMatchObject({ block: 'nearest' });
  });

  it('calls scrollIntoView on mount when a mockup URL is active from the start', async () => {
    mockPathname = '/projects/alpha/m1';
    const { ProjectTree } = await import('@/components/ProjectTree/ProjectTree');

    await act(async () => {
      root.render(createElement(ProjectTree, { projects: [project], orphanMockups: [] }));
    });

    expect(spy).toHaveBeenCalled();
    const callArg = spy.mock.calls[spy.mock.calls.length - 1][0];
    expect(callArg).toMatchObject({ block: 'nearest' });
  });
});

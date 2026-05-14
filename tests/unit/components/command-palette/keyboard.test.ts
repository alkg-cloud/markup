// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '@/components/CommandPalette/CommandPalette';
import type { TreeProject } from '@/components/ProjectTree/ProjectTree';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const projects: TreeProject[] = [
  {
    id: 'p1',
    name: 'Website',
    slug: 'website',
    icon: null,
    position: 0,
    folders: [],
    mockups: [],
  },
];

describe('CommandPalette keyboard shortcuts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens with uppercase Ctrl+K key events on Linux/Windows', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(CommandPalette, { projects }));
    });

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', ctrlKey: true }));
    });

    expect(container.querySelector('[aria-label="Command palette"]')).not.toBeNull();
    root.unmount();
  });
});

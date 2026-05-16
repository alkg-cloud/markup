// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('CommandPalette Ctrl+K dispatches open event', () => {
  let listener: ReturnType<typeof vi.fn>;
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    listener = vi.fn();
    document.addEventListener('open-command-palette', listener as EventListener);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    document.removeEventListener('open-command-palette', listener as EventListener);
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("dispatches 'open-command-palette' when Ctrl+K opens it", async () => {
    await act(async () => {
      root.render(createElement(CommandPalette, { projects }));
    });

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    expect(listener).toHaveBeenCalled();
  });
});

/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { ProjectTree } from '@/components/ProjectTree/ProjectTree';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

const project = {
  id: 'p1',
  name: 'Alpha',
  slug: 'alpha',
  icon: 'emoji:🎨',
  folders: [],
  mockups: [],
};

describe('ProjectTree aria-labels in English', () => {
  it("renders kebab menu aria-label as 'Menu for Alpha'", () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(ProjectTree, {
          projects: [project],
          orphanMockups: [],
        }),
      );
    });
    const kebab = container.querySelector('button[aria-label*="Menu"]');
    expect(kebab?.getAttribute('aria-label')).toBe('Menu for Alpha');
    expect(kebab?.getAttribute('aria-label')).not.toContain('Menu de');
    act(() => root.unmount());
    container.remove();
  });
});

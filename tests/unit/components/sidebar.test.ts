// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const COOKIE_KEY = 'markup-sidebar-collapsed';

function clearSidebarCookie() {
  // biome-ignore lint/suspicious/noDocumentCookie: mirrors the production cookie write in `Sidebar.tsx`.
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
}

beforeEach(() => {
  // useIsMobile calls window.matchMedia — stub it so the hook doesn't throw.
  vi.stubGlobal('matchMedia', (_query: string) => ({
    matches: false,
    media: _query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
});

describe('Sidebar', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.style.removeProperty('--sidebar-inset');
    clearSidebarCookie();
    vi.unstubAllGlobals();
  });

  it('persists collapsed state across remounts via the markup-sidebar-collapsed cookie', async () => {
    const { Sidebar } = await import('@/components/Sidebar/Sidebar');
    const container = document.createElement('div');
    document.body.append(container);

    const firstRoot = createRoot(container);
    await act(async () => {
      firstRoot.render(createElement(Sidebar, null, 'Projects'));
    });

    const collapseButton = container.querySelector(
      'button[aria-label="Collapse sidebar"]',
    ) as HTMLButtonElement;
    await act(async () => {
      collapseButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();
    expect(document.cookie).toContain(`${COOKIE_KEY}=true`);

    await act(async () => {
      firstRoot.unmount();
    });

    // Server-rendered remounts read the cookie via `next/headers` and
    // pass it down via `defaultCollapsed`. The unit harness has no
    // server pass — simulate the SSR contract by forwarding the cookie
    // value as a prop.
    const secondRoot = createRoot(container);
    await act(async () => {
      secondRoot.render(createElement(Sidebar, { defaultCollapsed: true, children: 'Projects' }));
    });

    expect(container.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();

    await act(async () => {
      secondRoot.unmount();
    });
  });
});

// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

const COOKIE_KEY = 'markup-sidebar-collapsed';

function clearSidebarCookie() {
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
}

describe('Sidebar', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.style.removeProperty('--sidebar-inset');
    clearSidebarCookie();
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
      secondRoot.render(createElement(Sidebar, { defaultCollapsed: true }, 'Projects'));
    });

    expect(container.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();

    await act(async () => {
      secondRoot.unmount();
    });
  });
});

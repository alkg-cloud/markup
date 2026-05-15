// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

describe('Sidebar', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.style.removeProperty('--sidebar-inset');
    localStorage.clear();
  });

  it('persists collapsed state across remounts', async () => {
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
    expect(localStorage.getItem('markup.sidebar.collapsed')).toBe('true');

    await act(async () => {
      firstRoot.unmount();
    });

    const secondRoot = createRoot(container);
    await act(async () => {
      secondRoot.render(createElement(Sidebar, null, 'Projects'));
    });

    expect(container.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();

    await act(async () => {
      secondRoot.unmount();
    });
  });
});

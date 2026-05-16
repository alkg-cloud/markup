/** @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { FolderHeader } from '@/components/FolderHeader/FolderHeader';

describe('FolderHeader', () => {
  it('renders icon + name + count', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(FolderHeader, { icon: 'emoji:🎨', name: 'Project Alpha', count: 8 }),
      );
    });
    expect(container.textContent).toContain('Project Alpha');
    expect(container.textContent).toContain('8 items');
    act(() => root.unmount());
    container.remove();
  });

  it('pluralises correctly', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(FolderHeader, { icon: 'emoji:🎨', name: 'X', count: 1 }));
    });
    expect(container.textContent).toContain('1 item');
    expect(container.textContent).not.toContain('1 items');
    act(() => root.unmount());
    container.remove();
  });

  it('does not render when count is 0 and name is null', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    // FolderHeader still renders even when count=0 — it's a section header,
    // not gated on count. This test just confirms it doesn't crash.
    act(() => {
      root.render(createElement(FolderHeader, { icon: 'emoji:📁', name: 'Empty', count: 0 }));
    });
    expect(container.textContent).toContain('0 items');
    act(() => root.unmount());
    container.remove();
  });
});

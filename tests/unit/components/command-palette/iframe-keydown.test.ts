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
    createdById: null,
    folders: [],
    mockups: [],
  },
];

describe('CommandPalette Ctrl+K dispatched inside a same-origin iframe', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens when the keydown originates inside an embedded iframe', async () => {
    // Inject the iframe BEFORE rendering so the initial scan picks it up.
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(CommandPalette, { projects }));
    });

    // Wait a microtask so the effect runs and wires the iframe document.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const innerDoc = iframe.contentDocument!;
    // Dispatching to the iframe's document mirrors what happens when the
    // user has focus inside the mockup iframe and presses Ctrl+K.
    await act(async () => {
      innerDoc.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      );
    });

    expect(container.querySelector('[aria-label="Command palette"]')).not.toBeNull();
    root.unmount();
  });

  it('wires up iframes that appear after mount via MutationObserver', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(CommandPalette, { projects }));
    });

    // Add the iframe AFTER mount; the MutationObserver inside the effect
    // should pick it up and wire its document.
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    // Give MutationObserver a microtask to fire.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      iframe.contentDocument!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      );
    });

    expect(container.querySelector('[aria-label="Command palette"]')).not.toBeNull();
    root.unmount();
  });
});

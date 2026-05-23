// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// Mock useIsMobile before importing Sidebar so the module-level import
// resolves to the mock.
let mockIsMobileValue = false;
vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobileValue,
}));

// Mock next/link — Sidebar uses <Link href="/">.
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: unknown;
    href: string;
    [k: string]: unknown;
  }) => createElement('a', { href, ...rest }, children),
}));

import { Sidebar } from '@/components/Sidebar/Sidebar';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  // jsdom does not implement HTMLDialogElement methods — define then spy.
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
  vi.spyOn(HTMLDialogElement.prototype, 'showModal');
  vi.spyOn(HTMLDialogElement.prototype, 'close');
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  document.documentElement.style.removeProperty('--sidebar-inset');
  vi.restoreAllMocks();
  mockIsMobileValue = false;
});

function renderSidebar(props: { defaultCollapsed?: boolean } = {}) {
  act(() => {
    root.render(
      createElement(Sidebar, { defaultCollapsed: props.defaultCollapsed ?? false }, 'Nav content'),
    );
  });
}

describe('Sidebar mobile drawer', () => {
  it('renders pill (collapsed) on mobile regardless of defaultCollapsed', () => {
    mockIsMobileValue = true;
    renderSidebar({ defaultCollapsed: false });
    // On mobile the sidebar must always show the "Expand sidebar" button
    // (i.e. collapsed pill), even if defaultCollapsed is false.
    const expandBtn = container.querySelector(
      'button[aria-label="Expand sidebar"]',
    ) as HTMLButtonElement | null;
    expect(expandBtn).not.toBeNull();
    const collapseBtn = container.querySelector('button[aria-label="Collapse sidebar"]');
    expect(collapseBtn).toBeNull();
  });

  it('respects defaultCollapsed on desktop', () => {
    mockIsMobileValue = false;
    renderSidebar({ defaultCollapsed: false });
    // On desktop with defaultCollapsed=false, sidebar renders expanded.
    const collapseBtn = container.querySelector(
      'button[aria-label="Collapse sidebar"]',
    ) as HTMLButtonElement | null;
    expect(collapseBtn).not.toBeNull();
    const expandBtn = container.querySelector('button[aria-label="Expand sidebar"]');
    expect(expandBtn).toBeNull();
  });

  it('opens the drawer on mobile when the pill is tapped', () => {
    mockIsMobileValue = true;
    renderSidebar();

    const showModalSpy = HTMLDialogElement.prototype.showModal as ReturnType<typeof vi.spyOn>;

    const expandBtn = container.querySelector(
      'button[aria-label="Expand sidebar"]',
    ) as HTMLButtonElement;
    expect(expandBtn).not.toBeNull();

    act(() => {
      expandBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(showModalSpy).toHaveBeenCalledTimes(1);

    // The <dialog> element should have the open attribute.
    const dialog = container.querySelector('dialog[aria-label="Navigation menu"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.hasAttribute('open')).toBe(true);
  });

  it('closes the drawer when the close button is tapped', () => {
    mockIsMobileValue = true;
    renderSidebar();

    const closeSpy = HTMLDialogElement.prototype.close as ReturnType<typeof vi.spyOn>;

    // Open the drawer first.
    const expandBtn = container.querySelector(
      'button[aria-label="Expand sidebar"]',
    ) as HTMLButtonElement;
    act(() => {
      expandBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Now close via the "Close menu" button.
    const closeBtn = container.querySelector(
      'button[aria-label="Close menu"]',
    ) as HTMLButtonElement | null;
    expect(closeBtn).not.toBeNull();

    act(() => {
      closeBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('closes the drawer when scrim (dialog backdrop) is clicked', () => {
    mockIsMobileValue = true;
    renderSidebar();

    const closeSpy = HTMLDialogElement.prototype.close as ReturnType<typeof vi.spyOn>;

    // Open the drawer first.
    const expandBtn = container.querySelector(
      'button[aria-label="Expand sidebar"]',
    ) as HTMLButtonElement;
    act(() => {
      expandBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const dialog = container.querySelector(
      'dialog[aria-label="Navigation menu"]',
    ) as HTMLDialogElement | null;
    expect(dialog).not.toBeNull();

    // Simulate a click whose target is the dialog element itself (the backdrop scrim).
    act(() => {
      const event = new MouseEvent('click', { bubbles: true });
      // Override target so e.target === dialogElement.
      Object.defineProperty(event, 'target', { value: dialog, configurable: true });
      dialog!.dispatchEvent(event);
    });

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});

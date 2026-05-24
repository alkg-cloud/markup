// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

let mockIsMobileValue = false;
vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobileValue,
}));

let mockPathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: ReactNode;
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
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  document.documentElement.style.removeProperty('--sidebar-inset');
  vi.restoreAllMocks();
  mockIsMobileValue = false;
  mockPathname = '/';
});

function renderSidebar(props: { defaultCollapsed?: boolean } = {}) {
  act(() => {
    root.render(
      createElement(Sidebar, {
        defaultCollapsed: props.defaultCollapsed ?? false,
        children: 'Nav content',
      }),
    );
  });
}

function reRender(defaultCollapsed = false) {
  act(() => {
    root.render(
      createElement(Sidebar, {
        defaultCollapsed,
        children: 'Nav content',
      }),
    );
  });
}

describe('Sidebar', () => {
  it('renders pill (collapsed) on mobile regardless of defaultCollapsed', () => {
    mockIsMobileValue = true;
    renderSidebar({ defaultCollapsed: false });
    // On mobile the React layer force-collapses on mount, so the "Expand
    // sidebar" button (the pill chevron) is what renders.
    expect(container.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Collapse sidebar"]')).toBeNull();
  });

  it('respects defaultCollapsed on desktop', () => {
    mockIsMobileValue = false;
    renderSidebar({ defaultCollapsed: false });
    expect(container.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Expand sidebar"]')).toBeNull();
  });

  it('expands the overlay on mobile when the pill chevron is tapped', () => {
    mockIsMobileValue = true;
    renderSidebar();

    // Before tap: collapsed pill, no scrim.
    expect(container.querySelector('button[aria-label="Close menu"]')).toBeNull();

    const expandBtn = container.querySelector(
      'button[aria-label="Expand sidebar"]',
    ) as HTMLButtonElement;
    act(() => {
      expandBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // After tap: the chevron flips to "Collapse sidebar" and the scrim
    // ("Close menu" button) is present.
    expect(container.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Close menu"]')).not.toBeNull();
  });

  it('collapses the overlay when the collapse chevron is tapped again', () => {
    mockIsMobileValue = true;
    renderSidebar();

    // Open.
    const expandBtn = container.querySelector(
      'button[aria-label="Expand sidebar"]',
    ) as HTMLButtonElement;
    act(() => {
      expandBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // The same button now labeled "Collapse sidebar" — tap to close.
    const collapseBtn = container.querySelector(
      'button[aria-label="Collapse sidebar"]',
    ) as HTMLButtonElement;
    act(() => {
      collapseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Close menu"]')).toBeNull();
  });

  it('collapses the overlay when the scrim is tapped', () => {
    mockIsMobileValue = true;
    renderSidebar();

    // Open.
    act(() => {
      (
        container.querySelector('button[aria-label="Expand sidebar"]') as HTMLButtonElement
      ).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const scrim = container.querySelector('button[aria-label="Close menu"]') as HTMLButtonElement;
    act(() => {
      scrim.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Close menu"]')).toBeNull();
  });

  it('collapses the overlay on ESC keydown', () => {
    mockIsMobileValue = true;
    renderSidebar();

    // Open.
    act(() => {
      (
        container.querySelector('button[aria-label="Expand sidebar"]') as HTMLButtonElement
      ).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('button[aria-label="Close menu"]')).not.toBeNull();

    // Dispatch ESC on document — the effect listens at the document level.
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(container.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Close menu"]')).toBeNull();
  });

  it('collapses the overlay on pathname change (tree nav-link tap)', () => {
    mockIsMobileValue = true;
    mockPathname = '/';
    renderSidebar();

    // Open.
    act(() => {
      (
        container.querySelector('button[aria-label="Expand sidebar"]') as HTMLButtonElement
      ).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('button[aria-label="Close menu"]')).not.toBeNull();

    // Simulate route change — re-render with new pathname.
    mockPathname = '/projects/lumen-coffee';
    reRender();

    expect(container.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Close menu"]')).toBeNull();
  });
});

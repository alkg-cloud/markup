// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import { useIsMobile } from '@/hooks/useIsMobile';

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
  vi.unstubAllGlobals();
});

let listeners: Array<(e: MediaQueryListEvent) => void> = [];
let currentMatches = false;

function mockMatchMedia(initialMatches: boolean) {
  currentMatches = initialMatches;
  listeners = [];
  vi.stubGlobal('matchMedia', (query: string) => {
    expect(query).toBe('(max-width: 767px)');
    return {
      matches: currentMatches,
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners.push(cb);
      },
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners = listeners.filter((l) => l !== cb);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  });
}

function mountHook(): { current: boolean } {
  const ref: { current: boolean } = { current: false };
  function Inner() {
    const isMobile = useIsMobile();
    useEffect(() => {
      ref.current = isMobile;
    });
    ref.current = isMobile;
    return null;
  }
  act(() => {
    root.render(createElement(Inner));
  });
  return ref;
}

describe('useIsMobile', () => {
  it('returns false on desktop viewport', () => {
    mockMatchMedia(false);
    const ref = mountHook();
    expect(ref.current).toBe(false);
  });

  it('returns true on mobile viewport', () => {
    mockMatchMedia(true);
    const ref = mountHook();
    expect(ref.current).toBe(true);
  });

  it('updates when viewport crosses 768 px', () => {
    mockMatchMedia(false);
    const ref = mountHook();
    expect(ref.current).toBe(false);

    act(() => {
      currentMatches = true;
      listeners.forEach((cb) =>
        cb({ matches: true, media: '(max-width: 767px)' } as MediaQueryListEvent),
      );
    });

    expect(ref.current).toBe(true);
  });
});

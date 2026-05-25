// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import { type UseViewportReturn, useViewport } from '@/components/MockupViewer/useViewport';
import { DEFAULT_VIEWPORT, VIEWPORT_PRESETS } from '@/components/MockupViewer/viewport-presets';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function mount(mockupId: string | undefined): { current: UseViewportReturn | null } {
  const ref: { current: UseViewportReturn | null } = { current: null };
  function Inner() {
    const api = useViewport(mockupId);
    useEffect(() => {
      ref.current = api;
    });
    ref.current = api;
    return null;
  }
  act(() => {
    root.render(createElement(Inner));
  });
  return ref;
}

describe('useViewport', () => {
  it('defaults to fit when no localStorage key exists', () => {
    const api = mount('m1');
    expect(api.current?.viewport).toEqual(DEFAULT_VIEWPORT);
  });

  it('restores from localStorage when key matches mockupId', () => {
    localStorage.setItem(
      'viewport:m1',
      JSON.stringify({ v: 1, mode: 'mobile', width: 390, height: 844, orientation: 'portrait' }),
    );
    const api = mount('m1');
    expect(api.current?.viewport).toEqual({
      mode: 'mobile',
      width: 390,
      height: 844,
      orientation: 'portrait',
    });
  });

  it('returns fit when stored v is unknown (forward-compat)', () => {
    localStorage.setItem(
      'viewport:m1',
      JSON.stringify({ v: 999, mode: 'mobile', width: 390, height: 844 }),
    );
    const api = mount('m1');
    expect(api.current?.viewport).toEqual(DEFAULT_VIEWPORT);
  });

  it('returns fit when stored JSON is malformed', () => {
    localStorage.setItem('viewport:m1', '{not json');
    const api = mount('m1');
    expect(api.current?.viewport).toEqual(DEFAULT_VIEWPORT);
  });

  it('setViewport persists to localStorage with v=1 + payload', () => {
    const api = mount('m1');
    act(() => {
      api.current?.setViewport({
        mode: 'desktop',
        width: VIEWPORT_PRESETS.desktop.width,
        height: VIEWPORT_PRESETS.desktop.height,
        orientation: 'portrait',
      });
    });
    const raw = localStorage.getItem('viewport:m1');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({
      v: 1,
      mode: 'desktop',
      width: 1440,
      height: 900,
      orientation: 'portrait',
    });
  });

  it('setViewport({mode:"fit"}) clears width/height to null', () => {
    const api = mount('m1');
    act(() => {
      api.current?.setViewport({
        mode: 'fit',
        width: null,
        height: null,
        orientation: 'portrait',
      });
    });
    expect(api.current?.viewport.width).toBeNull();
    expect(api.current?.viewport.height).toBeNull();
  });

  it('exposes the canonical presets table', () => {
    const api = mount('m1');
    expect(api.current?.presets).toEqual(VIEWPORT_PRESETS);
  });

  it('mockupId === undefined returns fit and skips persistence', () => {
    const api = mount(undefined);
    expect(api.current?.viewport).toEqual(DEFAULT_VIEWPORT);
    act(() => {
      api.current?.setViewport({
        mode: 'mobile',
        width: 390,
        height: 844,
        orientation: 'portrait',
      });
    });
    // No localStorage key should have been written.
    expect(localStorage.length).toBe(0);
  });
});

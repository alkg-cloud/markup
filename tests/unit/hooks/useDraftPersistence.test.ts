// @vitest-environment jsdom

import { createElement, useEffect } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import {
  useDraftPersistence,
  type UseDraftPersistenceArgs,
  type UseDraftPersistenceReturn,
} from '@/hooks/useDraftPersistence';
import {
  STORAGE_SCHEMA_VERSION,
  STALE_DRAFT_MS,
  DRAFT_DEBOUNCE_MS,
  storageKey,
} from '@/components/MockupViewer/draft-types';

const KEY = storageKey('m1', 'u1');

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
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
  vi.useRealTimers();
});

/** Mount the hook and capture its return value into a ref. */
function mount(args: UseDraftPersistenceArgs): { current: UseDraftPersistenceReturn | null } {
  const ref: { current: UseDraftPersistenceReturn | null } = { current: null };
  function Inner() {
    const api = useDraftPersistence(args);
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

describe('useDraftPersistence', () => {
  it('restores a non-stale draft on mount', () => {
    const stored = {
      body: 'hello',
      pins: [],
      lastSavedAt: Date.now(),
      schemaVersion: STORAGE_SCHEMA_VERSION,
    };
    localStorage.setItem(KEY, JSON.stringify(stored));
    const onRestore = vi.fn();
    mount({
      mockupId: 'm1',
      userId: 'u1',
      draft: null,
      onRestore,
      onFlushed: vi.fn(),
    });
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ body: 'hello' }));
  });

  it('discards a stale draft (>30 days)', () => {
    const stored = {
      body: 'hello',
      pins: [],
      lastSavedAt: Date.now() - STALE_DRAFT_MS - 1,
      schemaVersion: STORAGE_SCHEMA_VERSION,
    };
    localStorage.setItem(KEY, JSON.stringify(stored));
    const onRestore = vi.fn();
    mount({
      mockupId: 'm1',
      userId: 'u1',
      draft: null,
      onRestore,
      onFlushed: vi.fn(),
    });
    expect(onRestore).not.toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('discards a draft with mismatched schemaVersion', () => {
    const stored = { body: 'x', pins: [], lastSavedAt: Date.now(), schemaVersion: 0 };
    localStorage.setItem(KEY, JSON.stringify(stored));
    const onRestore = vi.fn();
    mount({
      mockupId: 'm1',
      userId: 'u1',
      draft: null,
      onRestore,
      onFlushed: vi.fn(),
    });
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('debounces writes to localStorage when draft changes', () => {
    const draft = { body: 'a', pins: [], lastSavedAt: null, hasUnsavedChanges: true };
    const onFlushed = vi.fn();
    mount({
      mockupId: 'm1',
      userId: 'u1',
      draft,
      onRestore: vi.fn(),
      onFlushed,
    });
    expect(localStorage.getItem(KEY)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS);
    });
    expect(localStorage.getItem(KEY)).not.toBeNull();
    expect(onFlushed).toHaveBeenCalled();
  });

  it('flush() writes immediately', () => {
    const draft = { body: 'now', pins: [], lastSavedAt: null, hasUnsavedChanges: true };
    const onFlushed = vi.fn();
    const api = mount({
      mockupId: 'm1',
      userId: 'u1',
      draft,
      onRestore: vi.fn(),
      onFlushed,
    });
    act(() => {
      api.current!.flush();
    });
    expect(localStorage.getItem(KEY)).not.toBeNull();
    expect(onFlushed).toHaveBeenCalledTimes(1);
  });

  it('clear() removes the entry', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        body: 'x',
        pins: [],
        lastSavedAt: Date.now(),
        schemaVersion: STORAGE_SCHEMA_VERSION,
      }),
    );
    const api = mount({
      mockupId: 'm1',
      userId: 'u1',
      draft: null,
      onRestore: vi.fn(),
      onFlushed: vi.fn(),
    });
    act(() => {
      api.current!.clear();
    });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('flushes on visibilitychange to hidden when dirty', () => {
    const draft = { body: 'x', pins: [], lastSavedAt: null, hasUnsavedChanges: true };
    const onFlushed = vi.fn();
    mount({
      mockupId: 'm1',
      userId: 'u1',
      draft,
      onRestore: vi.fn(),
      onFlushed,
    });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(onFlushed).toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });
});

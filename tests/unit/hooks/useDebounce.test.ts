// @vitest-environment jsdom

import { createElement, useEffect, useRef } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import { useDebounce } from '@/hooks/useDebounce';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
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

/**
 * Mount a hook and capture its return value into a ref so tests can call it.
 */
function mountDebounce<TArgs extends unknown[]>(
  getFn: () => (...args: TArgs) => void,
  wait: number,
): { current: (...args: TArgs) => void } {
  const ref: { current: ((...args: TArgs) => void) | null } = { current: null };
  function Inner() {
    const debounced = useDebounce(getFn(), wait);
    const stable = useRef(debounced);
    stable.current = debounced;
    useEffect(() => {
      ref.current = debounced;
    });
    ref.current = debounced;
    return null;
  }
  act(() => {
    root.render(createElement(Inner));
  });
  return ref as { current: (...args: TArgs) => void };
}

describe('useDebounce', () => {
  it('fires fn once after wait ms', () => {
    const fn = vi.fn();
    const debounced = mountDebounce(() => fn, 100);
    act(() => debounced.current('a'));
    expect(fn).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('cancels pending call when invoked again before wait', () => {
    const fn = vi.fn();
    const debounced = mountDebounce(() => fn, 100);
    act(() => debounced.current('a'));
    act(() => {
      vi.advanceTimersByTime(50);
    });
    act(() => debounced.current('b'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b');
  });

  it('clears pending timer on unmount', () => {
    const fn = vi.fn();
    const debounced = mountDebounce(() => fn, 100);
    act(() => debounced.current('a'));
    act(() => {
      root.unmount();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('uses the latest fn reference (no stale closure)', () => {
    let counter = 0;
    let n = 1;

    const ref: { current: (() => void) | null } = { current: null };
    function Inner() {
      const debounced = useDebounce(() => {
        counter = n;
      }, 100);
      useEffect(() => {
        ref.current = debounced;
      });
      ref.current = debounced;
      return null;
    }

    act(() => {
      root.render(createElement(Inner));
    });
    act(() => ref.current!());

    // Rerender with new closure (n changes).
    n = 99;
    act(() => {
      root.render(createElement(Inner));
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(counter).toBe(99);
  });
});

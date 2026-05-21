// @vitest-environment jsdom

import { act, createElement, useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import {
  type DragState,
  type DragTarget,
  DragTargetProvider,
  type DropEvent,
  useDragTarget,
  useDragTargetActions,
} from '@/hooks/useDragTarget';

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
  vi.useRealTimers();
});

const PROJECT_TARGET: DragTarget = {
  projectId: 'proj-1',
  folderId: null,
  projectLabel: 'Hero project',
  folderPath: [],
};

/**
 * Harness mounts <DragTargetProvider> around an inner component that
 * captures the live `useDragTarget()` state and the
 * `useDragTargetActions()` API into outer refs. Tests read from those
 * refs after triggering events.
 */
function makeHarness(resolveTarget: () => DragTarget | null) {
  const state: { current: DragState | null } = { current: null };
  const actions: { current: { consumeDrop: () => DropEvent | null } | null } = {
    current: null,
  };

  function Inner() {
    const s = useDragTarget();
    const a = useDragTargetActions();
    const stateRef = useRef(s);
    stateRef.current = s;
    useEffect(() => {
      state.current = s;
      actions.current = a;
    });
    state.current = s;
    actions.current = a;
    return null;
  }

  function render() {
    act(() => {
      root.render(createElement(DragTargetProvider, { resolveTarget }, createElement(Inner, null)));
    });
  }

  return { state, actions, render };
}

/**
 * jsdom doesn't ship DragEvent (or a usable `dataTransfer` on it). We
 * dispatch a plain Event and bolt a `dataTransfer` stub on via
 * `Object.defineProperty` so the hook's reads work the same as in a
 * real browser.
 */
function dispatchDrag(
  type: 'dragenter' | 'dragover' | 'dragleave' | 'drop',
  init: { types?: readonly string[]; files?: File[] } = {},
): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const fileList = makeFileList(init.files ?? []);
  Object.defineProperty(ev, 'dataTransfer', {
    value: {
      types: init.types ?? [],
      files: fileList,
    },
    configurable: true,
  });
  document.dispatchEvent(ev);
  return ev;
}

function makeFileList(files: File[]): FileList {
  // FileList is constructable via DataTransfer, but jsdom's DataTransfer
  // is incomplete. A duck-typed object suffices for the hook (it only
  // reads `.files` from `dataTransfer`).
  const list = {
    length: files.length,
    item(i: number) {
      return files[i] ?? null;
    },
    [Symbol.iterator]: function* () {
      for (const f of files) yield f;
    },
  } as unknown as FileList;
  for (let i = 0; i < files.length; i++) {
    (list as unknown as Record<number, File>)[i] = files[i];
  }
  return list;
}

function htmlFile(name = 'index.html') {
  return new File(['<html></html>'], name, { type: 'text/html' });
}

describe('useDragTarget', () => {
  it('initial state is { isOver: false, lastDrop: null }', () => {
    const { state, render } = makeHarness(() => PROJECT_TARGET);
    render();
    expect(state.current).toEqual({ isOver: false, lastDrop: null });
  });

  it('flips isOver=true on dragenter with Files in dataTransfer.types', () => {
    const { state, render } = makeHarness(() => PROJECT_TARGET);
    render();
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    expect(state.current?.isOver).toBe(true);
    if (state.current?.isOver) {
      expect(state.current.target).toEqual(PROJECT_TARGET);
    }
  });

  it('ignores dragenter that lacks "Files" (tree DnD using text/plain)', () => {
    const { state, render } = makeHarness(() => PROJECT_TARGET);
    render();
    act(() => {
      dispatchDrag('dragenter', { types: ['text/plain'] });
    });
    expect(state.current?.isOver).toBe(false);
  });

  it('ignores dragenter when resolveTarget() returns null', () => {
    const { state, render } = makeHarness(() => null);
    render();
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    expect(state.current?.isOver).toBe(false);
  });

  it('dragover calls preventDefault so the browser allows drop', () => {
    const { render } = makeHarness(() => PROJECT_TARGET);
    render();
    // Prime isOver first — dragover only matters once a drag is active.
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    const ev = dispatchDrag('dragover', { types: ['Files'] });
    expect(ev.defaultPrevented).toBe(true);
  });

  it('debounces dragleave by 60ms before flipping isOver=false', () => {
    vi.useFakeTimers();
    const { state, render } = makeHarness(() => PROJECT_TARGET);
    render();
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    expect(state.current?.isOver).toBe(true);

    act(() => {
      dispatchDrag('dragleave', { types: ['Files'] });
    });
    // Still over — within the debounce window.
    expect(state.current?.isOver).toBe(true);

    act(() => {
      vi.advanceTimersByTime(59);
    });
    expect(state.current?.isOver).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(state.current?.isOver).toBe(false);
  });

  it('dragleave followed by dragenter within 60ms stays isOver=true', () => {
    vi.useFakeTimers();
    const { state, render } = makeHarness(() => PROJECT_TARGET);
    render();
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    act(() => {
      dispatchDrag('dragleave', { types: ['Files'] });
    });
    act(() => {
      vi.advanceTimersByTime(30);
    });
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    // Push past the original debounce deadline; the re-enter must have
    // cancelled the pending leave.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(state.current?.isOver).toBe(true);
  });

  it('drop calls preventDefault, clears isOver, and snapshots a DropEvent', () => {
    const { state, actions, render } = makeHarness(() => PROJECT_TARGET);
    render();
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    const f = htmlFile();
    const before = Date.now();
    let dropEv: Event | undefined;
    act(() => {
      dropEv = dispatchDrag('drop', { types: ['Files'], files: [f] });
    });
    const after = Date.now();

    expect(dropEv?.defaultPrevented).toBe(true);
    expect(state.current?.isOver).toBe(false);

    const last = actions.current?.consumeDrop() ?? null;
    expect(last).not.toBeNull();
    if (!last) return;
    expect(last.files.length).toBe(1);
    expect(last.files.item(0)).toBe(f);
    expect(last.target).toEqual(PROJECT_TARGET);
    expect(last.at).toBeGreaterThanOrEqual(before);
    expect(last.at).toBeLessThanOrEqual(after);
  });

  it('consumeDrop() returns the event once, then null on subsequent calls', () => {
    const { actions, render } = makeHarness(() => PROJECT_TARGET);
    render();
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    act(() => {
      dispatchDrag('drop', { types: ['Files'], files: [htmlFile()] });
    });
    const first = actions.current?.consumeDrop() ?? null;
    const second = actions.current?.consumeDrop() ?? null;
    const third = actions.current?.consumeDrop() ?? null;
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(third).toBeNull();
  });

  it('drop re-resolves target (route may have changed mid-drag)', () => {
    let current: DragTarget | null = PROJECT_TARGET;
    const { actions, render } = makeHarness(() => current);
    render();
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    // Simulate a navigation while the drag was in flight.
    const next: DragTarget = {
      projectId: 'proj-2',
      folderId: 'folder-9',
      projectLabel: 'Other',
      folderPath: ['Section'],
    };
    current = next;
    act(() => {
      dispatchDrag('drop', { types: ['Files'], files: [htmlFile()] });
    });
    const last = actions.current?.consumeDrop() ?? null;
    expect(last?.target).toEqual(next);
  });

  it('drop with no resolved target falls back to last known target', () => {
    // If `resolveTarget()` returns null at drop time but we were already
    // over a valid target, we still snapshot the original. (The user
    // entered the page intending to drop on it; if navigation happened
    // mid-drag we tolerate the stale target — never produce a drop with
    // no target.)
    let current: DragTarget | null = PROJECT_TARGET;
    const { actions, render } = makeHarness(() => current);
    render();
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    current = null;
    act(() => {
      dispatchDrag('drop', { types: ['Files'], files: [htmlFile()] });
    });
    const last = actions.current?.consumeDrop() ?? null;
    expect(last?.target).toEqual(PROJECT_TARGET);
  });

  it('removes document listeners on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { render } = makeHarness(() => PROJECT_TARGET);
    render();
    act(() => {
      root.unmount();
    });
    const removed = removeSpy.mock.calls.map((c) => c[0]);
    expect(removed).toContain('dragenter');
    expect(removed).toContain('dragover');
    expect(removed).toContain('dragleave');
    expect(removed).toContain('drop');
    removeSpy.mockRestore();
    // Re-mount a fresh harness; firing a dragenter at the document
    // afterwards must NOT mutate the unmounted harness's last seen
    // state (it already disposed). The cleanest assertion is that
    // we removed each listener kind.
  });
});

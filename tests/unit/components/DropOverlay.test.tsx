// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import { DropOverlay } from '@/components/DropOverlay';
import { type DragTarget, DragTargetProvider } from '@/hooks/useDragTarget';

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
  projectLabel: 'Lumen Coffee',
  folderPath: [],
};

const NESTED_TARGET: DragTarget = {
  projectId: 'proj-1',
  folderId: 'folder-9',
  projectLabel: 'Lumen Coffee',
  folderPath: ['Hero', 'Section'],
};

const UNSORTED_TARGET: DragTarget = {
  projectId: null,
  folderId: null,
  projectLabel: 'Unsorted',
  folderPath: [],
};

/**
 * jsdom doesn't ship a usable DragEvent (no `dataTransfer`), so we
 * dispatch a plain Event and bolt a `dataTransfer` stub on via
 * `Object.defineProperty` — same pattern as the useDragTarget tests.
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

function renderWithTarget(
  target: DragTarget | null,
  children: ReactNode = createElement(DropOverlay),
) {
  act(() => {
    root.render(createElement(DragTargetProvider, { resolveTarget: () => target }, children));
  });
}

function findOverlay(): HTMLElement | null {
  return document.querySelector('[data-drop-overlay]') as HTMLElement | null;
}

describe('DropOverlay', () => {
  it('renders nothing when no drag is in progress', () => {
    renderWithTarget(PROJECT_TARGET);
    expect(findOverlay()).toBeNull();
  });

  it('mounts overlay on dragenter with Files', () => {
    renderWithTarget(PROJECT_TARGET);
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    const overlay = findOverlay();
    expect(overlay).not.toBeNull();
  });

  it('unmounts overlay on drop', () => {
    renderWithTarget(PROJECT_TARGET);
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    expect(findOverlay()).not.toBeNull();
    act(() => {
      dispatchDrag('drop', { types: ['Files'], files: [] });
    });
    expect(findOverlay()).toBeNull();
  });

  it('portals into document.body (not into the harness container)', () => {
    renderWithTarget(PROJECT_TARGET);
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    const overlay = findOverlay();
    expect(overlay).not.toBeNull();
    // Overlay must NOT live inside the React-rendered container.
    expect(container.contains(overlay)).toBe(false);
    expect(document.body.contains(overlay)).toBe(true);
  });

  it('exposes ARIA role="status" + aria-live="polite" on the overlay', () => {
    renderWithTarget(PROJECT_TARGET);
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    const overlay = findOverlay();
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('role')).toBe('status');
    expect(overlay?.getAttribute('aria-live')).toBe('polite');
  });

  it('path-preview shows project label only when folderPath is empty', () => {
    renderWithTarget(PROJECT_TARGET);
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    const overlay = findOverlay();
    expect(overlay?.textContent).toContain('Lumen Coffee');
    // No folder segments
    expect(overlay?.querySelectorAll('[data-seg="folder"]').length).toBe(0);
  });

  it('path-preview includes project + each folder segment with separators', () => {
    renderWithTarget(NESTED_TARGET);
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    const overlay = findOverlay();
    expect(overlay).not.toBeNull();
    const text = overlay?.textContent ?? '';
    expect(text).toContain('Lumen Coffee');
    expect(text).toContain('Hero');
    expect(text).toContain('Section');
    // Two folder segments and two separators preceding them.
    const folderSegs = overlay?.querySelectorAll('[data-seg="folder"]');
    expect(folderSegs?.length).toBe(2);
    const seps = overlay?.querySelectorAll('[data-seg="sep"]');
    expect(seps?.length).toBe(2);
  });

  it('path-preview falls back to "Unsorted" when projectLabel is "Unsorted"', () => {
    renderWithTarget(UNSORTED_TARGET);
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    const overlay = findOverlay();
    expect(overlay?.textContent).toContain('Unsorted');
    expect(overlay?.querySelectorAll('[data-seg="folder"]').length).toBe(0);
  });

  it('renders the disclaimer text', () => {
    renderWithTarget(PROJECT_TARGET);
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    const overlay = findOverlay();
    expect(overlay?.textContent).toMatch(/change the project and folder/i);
  });

  it('renders the "Drop your HTML here" title', () => {
    renderWithTarget(PROJECT_TARGET);
    act(() => {
      dispatchDrag('dragenter', { types: ['Files'] });
    });
    const overlay = findOverlay();
    expect(overlay?.textContent).toContain('Drop your HTML here');
  });
});

// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom doesn't implement PointerEvent / hasPointerCapture / scrollIntoView,
// which Radix's primitives rely on (FolderPicker uses Popover, Dialog uses
// DismissableLayer). Polyfill the minimum surface — matches the harness in
// NewMockupDialog.test.tsx.
if (typeof window !== 'undefined') {
  if (!(window as unknown as { PointerEvent?: unknown }).PointerEvent) {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 0;
        this.pointerType = params.pointerType ?? 'mouse';
      }
    }
    (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => undefined;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => undefined;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined;
  }
}

// Mock next/navigation — provider doesn't navigate itself but the dialog
// does, and `useRouter` is invoked unconditionally on render.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

// Mock the dialog's hooks so we don't depend on html2canvas / XHR.
vi.mock('@/components/NewMockupDialog/useFilePreview', () => ({
  useFilePreview: () => ({ state: 'ready', dataUrl: 'data:image/png;base64,x' }),
}));

vi.mock('@/components/NewMockupDialog/useUploadMockup', () => ({
  useUploadMockup: () => ({
    state: { status: 'idle' },
    start: vi.fn(),
    abort: vi.fn(),
    reset: vi.fn(),
  }),
}));

import {
  NewMockupDialogProvider,
  useNewMockupDialog,
} from '@/components/NewMockupDialog/NewMockupDialogProvider';
import { __resetFoldersCacheForTests } from '@/components/NewMockupDialog/useFolders';
import { ToastProvider } from '@/components/Toast/useToast';
import type { DragTarget } from '@/hooks/useDragTarget';

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  __resetFoldersCacheForTests();
  // Mock fetch: /api/projects returns a small project list; /api/projects/<id>/tree
  // returns the tree. Anything else 404s so unexpected calls are loud.
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/projects/') && url.endsWith('/tree')) {
      return new Response(
        JSON.stringify({
          id: 'p1',
          name: 'Lumen Coffee',
          slug: 'lumen-coffee',
          icon: '☕',
          position: 0,
          folders: [
            {
              id: 'hero',
              name: 'Hero',
              position: 0,
              children: [
                { id: 'hero-section', name: 'Section', position: 0, children: [], mockups: [] },
              ],
              mockups: [],
            },
          ],
          mockups: [],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.endsWith('/api/projects')) {
      return new Response(
        JSON.stringify({
          projects: [
            { id: 'p1', slug: 'lumen-coffee', name: 'Lumen Coffee', icon: '☕' },
            { id: 'p2', slug: 'helio', name: 'Helio', icon: '📐' },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('not found', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

function htmlFile(name = 'pricing.html'): File {
  return new File(['<html></html>'], name, { type: 'text/html' });
}

function findDialog(): HTMLElement | null {
  return document.querySelector('[role="dialog"]') as HTMLElement | null;
}

/**
 * Tiny consumer that exposes the provider's `openDialog` so the test
 * can drive the flow imperatively. The button mount also proves that
 * the hook is reachable from descendants without throwing.
 */
function Opener(props: {
  file?: File | null;
  mode?: 'add' | 'replace';
  currentMockup?: { id: string; name: string };
  target?: DragTarget | null;
}) {
  const { openDialog } = useNewMockupDialog();
  return (
    <button
      type="button"
      data-testid="open-dialog"
      onClick={() =>
        openDialog({
          file: props.file ?? htmlFile(),
          mode: props.mode,
          currentMockup: props.currentMockup,
          target: props.target,
        })
      }
    >
      open
    </button>
  );
}

function renderWithProvider(node: React.ReactNode) {
  act(() => {
    root.render(
      <ToastProvider>
        <NewMockupDialogProvider>{node}</NewMockupDialogProvider>
      </ToastProvider>,
    );
  });
}

async function flushAsync(): Promise<void> {
  // Two micro-task ticks: one for the fetch promise, one for the
  // state-setting `then` callback. We use `act()` so React effects
  // flush deterministically before the next assertion.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('NewMockupDialogProvider', () => {
  it('renders no dialog initially', () => {
    renderWithProvider(<Opener />);
    expect(findDialog()).toBeNull();
  });

  it('openDialog({ file }) mounts the dialog', async () => {
    renderWithProvider(<Opener />);
    const opener = document.querySelector('[data-testid="open-dialog"]') as HTMLButtonElement;
    act(() => {
      opener.click();
    });
    await flushAsync();
    expect(findDialog()).not.toBeNull();
    expect(findDialog()?.textContent).toContain('New mockup');
  });

  it('lazy-fetches /api/projects on first openDialog (and only once across re-opens)', async () => {
    renderWithProvider(<Opener />);
    // Provider mount alone must not hit the network — the dialog data
    // is genuinely lazy.
    expect(fetchMock).not.toHaveBeenCalled();

    const opener = document.querySelector('[data-testid="open-dialog"]') as HTMLButtonElement;
    act(() => {
      opener.click();
    });
    await flushAsync();
    const projectCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/api/projects'));
    expect(projectCalls.length).toBe(1);

    // Re-open with a fresh file — the cached project list is reused.
    act(() => {
      opener.click();
    });
    await flushAsync();
    const projectCallsAfter = fetchMock.mock.calls.filter((c) =>
      String(c[0]).endsWith('/api/projects'),
    );
    expect(projectCallsAfter.length).toBe(1);
  });

  it('closing the dialog (Cancel) unmounts it', async () => {
    renderWithProvider(<Opener />);
    const opener = document.querySelector('[data-testid="open-dialog"]') as HTMLButtonElement;
    act(() => {
      opener.click();
    });
    await flushAsync();
    expect(findDialog()).not.toBeNull();

    // Click the Cancel button (RadixDialog.Close).
    const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
    const cancel = buttons.find((b) => b.textContent?.trim() === 'Cancel');
    if (!cancel) throw new Error('cancel button not found');
    act(() => {
      cancel.click();
    });
    await flushAsync();
    expect(findDialog()).toBeNull();
  });

  it('opening with a resolved-id target fetches the tree for that project', async () => {
    const target: DragTarget = {
      projectId: 'p1',
      folderId: null,
      projectLabel: 'Lumen Coffee',
      folderPath: [],
    };
    renderWithProvider(<Opener target={target} />);
    const opener = document.querySelector('[data-testid="open-dialog"]') as HTMLButtonElement;
    act(() => {
      opener.click();
    });
    await flushAsync();
    const treeCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/p1/tree'));
    expect(treeCalls.length).toBe(1);
  });

  it('project switch: changing the project select inside the dialog refetches folders', async () => {
    renderWithProvider(<Opener />);
    const opener = document.querySelector('[data-testid="open-dialog"]') as HTMLButtonElement;
    act(() => {
      opener.click();
    });
    await flushAsync();

    // No project selected at first → no tree calls yet.
    let treeCalls = fetchMock.mock.calls.filter((c) =>
      /\/api\/projects\/[^/]+\/tree$/.test(String(c[0])),
    );
    expect(treeCalls.length).toBe(0);

    // User picks Lumen Coffee in the in-dialog select.
    const select = document.querySelector('select') as HTMLSelectElement;
    act(() => {
      select.value = 'p1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flushAsync();
    treeCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/p1/tree'));
    expect(treeCalls.length).toBe(1);

    // Then they flip to Helio — the second tree call fires.
    act(() => {
      select.value = 'p2';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flushAsync();
    const p2TreeCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/p2/tree'));
    expect(p2TreeCalls.length).toBe(1);

    // Flipping back to p1 is a cache hit — no additional /p1/tree call.
    act(() => {
      select.value = 'p1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flushAsync();
    const p1TreeAfter = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/p1/tree'));
    expect(p1TreeAfter.length).toBe(1);
  });

  it('opening with a URL-resolver target (projectLabel = slug) resolves projectId after projects load', async () => {
    // Mimic what `resolveTargetFromPath('/projects/lumen-coffee/Hero')` returns.
    const target: DragTarget = {
      projectId: null,
      folderId: null,
      projectLabel: 'lumen-coffee',
      folderPath: ['Hero'],
    };
    renderWithProvider(<Opener target={target} />);
    const opener = document.querySelector('[data-testid="open-dialog"]') as HTMLButtonElement;
    act(() => {
      opener.click();
    });
    await flushAsync();

    // The dialog mapped slug → 'p1' and the project <select> reflects it.
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('p1');

    // The tree for p1 was fetched, and the folder name `Hero` from the
    // URL path was resolved to its id `hero` (per the mocked tree).
    const treeCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/p1/tree'));
    expect(treeCalls.length).toBe(1);
    const folderTrigger = document.querySelector(
      '[data-folder-picker-trigger]',
    ) as HTMLButtonElement;
    expect(folderTrigger.textContent).toContain('Hero');
  });

  it('opening with a slug that has no match leaves selectedProjectId null', async () => {
    const target: DragTarget = {
      projectId: null,
      folderId: null,
      projectLabel: 'no-such-slug',
      folderPath: [],
    };
    renderWithProvider(<Opener target={target} />);
    const opener = document.querySelector('[data-testid="open-dialog"]') as HTMLButtonElement;
    act(() => {
      opener.click();
    });
    await flushAsync();
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('');
    const treeCalls = fetchMock.mock.calls.filter((c) =>
      /\/api\/projects\/[^/]+\/tree$/.test(String(c[0])),
    );
    expect(treeCalls.length).toBe(0);
  });

  it('subsequent openDialog calls swap the active file', async () => {
    renderWithProvider(<Opener file={htmlFile('first.html')} />);
    const opener = document.querySelector('[data-testid="open-dialog"]') as HTMLButtonElement;
    act(() => {
      opener.click();
    });
    await flushAsync();
    // The dialog seeds the name input from the filename — verify it
    // reflects the first file.
    let nameInput = Array.from(document.querySelectorAll('input')).find(
      (i) => i.getAttribute('name') === 'name',
    ) as HTMLInputElement | undefined;
    expect(nameInput?.value).toBe('first');

    // Re-render Opener with a different file, then click again.
    act(() => {
      root.render(
        <ToastProvider>
          <NewMockupDialogProvider>
            <Opener file={htmlFile('second.html')} />
          </NewMockupDialogProvider>
        </ToastProvider>,
      );
    });
    const opener2 = document.querySelector('[data-testid="open-dialog"]') as HTMLButtonElement;
    act(() => {
      opener2.click();
    });
    await flushAsync();
    nameInput = Array.from(document.querySelectorAll('input')).find(
      (i) => i.getAttribute('name') === 'name',
    ) as HTMLInputElement | undefined;
    expect(nameInput?.value).toBe('second');
  });
});

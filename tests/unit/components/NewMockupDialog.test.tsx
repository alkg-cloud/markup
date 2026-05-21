// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom doesn't implement PointerEvent / hasPointerCapture / scrollIntoView,
// which Radix's primitives rely on (FolderPicker uses Popover, Dialog uses
// DismissableLayer). Polyfill the minimum surface — matches the harness in
// FolderPicker.test.tsx.
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

// Capture next/navigation.useRouter so tests can assert on `push()`.
const routerPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn(), refresh: vi.fn() }),
}));

// Mock useFilePreview so we don't run html2canvas / mount iframes in the
// test environment. We expose a controllable mock so each test can pick
// the state the preview should report.
type PreviewState =
  | { state: 'loading'; dataUrl: null }
  | { state: 'ready'; dataUrl: string }
  | { state: 'fallback'; dataUrl: null; reason: 'zip' | 'timeout' | 'error' };

let previewState: PreviewState = { state: 'loading', dataUrl: null };
vi.mock('@/components/NewMockupDialog/useFilePreview', () => ({
  useFilePreview: () => previewState,
}));

// Mock useUploadMockup with a small controllable state-machine harness.
// Tests set `uploadState`, then call `triggerStart` / `triggerSuccess` /
// `triggerError` indirectly by mutating `uploadState` and re-rendering.
type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | {
      status: 'success';
      mockup: { id: string; slug: string; projectSlug?: string; folderPath?: string[] };
    }
  | {
      status: 'error';
      route: 'field' | 'global';
      error: { kind: string; detail?: string; limit?: number };
    };

let uploadState: UploadState = { status: 'idle' };
const startSpy = vi.fn();
const abortSpy = vi.fn();
const resetSpy = vi.fn();
// Setter the mock exposes so the tests can mutate the hook's state and
// force a re-render via `setState` in the harness. We wire it during
// each render via the `useUploadMockup` factory.
let forceRender: (() => void) | null = null;

vi.mock('@/components/NewMockupDialog/useUploadMockup', () => ({
  useUploadMockup: () => ({
    state: uploadState,
    start: (...args: unknown[]) => {
      startSpy(...args);
      uploadState = { status: 'uploading', progress: 0 };
      if (forceRender) forceRender();
    },
    abort: () => {
      abortSpy();
      uploadState = { status: 'idle' };
      if (forceRender) forceRender();
    },
    reset: () => {
      resetSpy();
      uploadState = { status: 'idle' };
      if (forceRender) forceRender();
    },
  }),
}));

// Mock useFolders so the dialog renders against a controllable folder
// list per projectId — no fetch is involved.
type FoldersByProject = Record<string, FolderPickerFolder[]>;
let foldersByProject: FoldersByProject = {};
let lastUseFoldersCallProjectId: string | null | undefined;
const useFoldersCalls: Array<string | null> = [];

vi.mock('@/components/NewMockupDialog/useFolders', () => ({
  useFolders: (projectId: string | null) => {
    useFoldersCalls.push(projectId);
    lastUseFoldersCallProjectId = projectId;
    return {
      folders: projectId === null ? [] : (foldersByProject[projectId] ?? []),
      loading: false,
    };
  },
}));

import { useState } from 'react';
import type { FolderPickerFolder } from '@/components/FolderPicker';
import {
  NewMockupDialog,
  type NewMockupDialogProject,
  type NewMockupDialogTarget,
} from '@/components/NewMockupDialog';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  routerPush.mockReset();
  startSpy.mockReset();
  abortSpy.mockReset();
  resetSpy.mockReset();
  uploadState = { status: 'idle' };
  previewState = { state: 'ready', dataUrl: 'data:image/png;base64,FAKE' };
  // Seed per-test folder map: p1 gets the test fixture; p2 gets a
  // distinct list so we can prove the picker re-keys on project switch.
  foldersByProject = {
    p1: [
      { id: 'hero', name: 'Hero', parentId: null },
      { id: 'hero-section', name: 'Section', parentId: 'hero' },
      { id: 'pricing', name: 'Pricing', parentId: null },
    ],
    p2: [
      { id: 'helio-landing', name: 'Landing', parentId: null },
      { id: 'helio-docs', name: 'Docs', parentId: null },
    ],
  };
  useFoldersCalls.length = 0;
  lastUseFoldersCallProjectId = undefined;
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  forceRender = null;
});

const PROJECTS: NewMockupDialogProject[] = [
  { id: 'p1', slug: 'lumen-coffee', name: 'Lumen Coffee', icon: '☕' },
  { id: 'p2', slug: 'helio', name: 'Helio', icon: '📐' },
];

const DEFAULT_TARGET: NewMockupDialogTarget = {
  projectId: 'p1',
  folderId: 'hero',
  projectSlug: 'lumen-coffee',
  folderPath: ['Hero'],
};

function htmlFile(name = 'pricing-v3.html'): File {
  return new File(['<html><body>x</body></html>'], name, { type: 'text/html' });
}

/** Harness lets tests force a re-render after the mocked hooks mutate
 *  `uploadState` outside React's lifecycle. The dialog itself is
 *  controlled so we also expose its own `open` state. */
function Harness(props: {
  initialOpen: boolean;
  file: File | null;
  mode?: 'add' | 'replace';
  currentMockup?: { id: string; name: string };
  onOpenChange?: (open: boolean) => void;
  target?: NewMockupDialogTarget;
  projects?: NewMockupDialogProject[];
}) {
  const [open, setOpen] = useState(props.initialOpen);
  const [, force] = useState(0);
  forceRender = () => force((n) => n + 1);
  return (
    <NewMockupDialog
      open={open}
      onOpenChange={(next) => {
        props.onOpenChange?.(next);
        setOpen(next);
      }}
      file={props.file}
      target={props.target ?? DEFAULT_TARGET}
      mode={props.mode}
      currentMockup={props.currentMockup}
      projects={props.projects ?? PROJECTS}
    />
  );
}

function renderHarness(node: React.ReactElement) {
  act(() => {
    root.render(node);
  });
}

function findDialog(): HTMLElement | null {
  return document.querySelector('[role="dialog"]') as HTMLElement | null;
}

function findNameInput(): HTMLInputElement {
  const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
  const named = inputs.find((i) => i.getAttribute('name') === 'name');
  if (!named) throw new Error('name input not found');
  return named;
}

function findSubmitButton(): HTMLButtonElement {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
  const submit = buttons.find((b) => b.getAttribute('type') === 'submit');
  if (!submit) throw new Error('submit button not found');
  return submit;
}

function findCancelButton(): HTMLButtonElement {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
  // Cancel is rendered via RadixDialog.Close + asChild. It carries the
  // dialog's close `data-state` attribute.
  const cancel = buttons.find((b) => b.textContent?.trim() === 'Cancel');
  if (!cancel) throw new Error('cancel button not found');
  return cancel;
}

describe('NewMockupDialog', () => {
  it('renders nothing observable when open=false', () => {
    renderHarness(<Harness initialOpen={false} file={htmlFile()} />);
    expect(findDialog()).toBeNull();
  });

  it('mounts the dialog, pre-fills the name from the filename, and pre-selects the target', () => {
    renderHarness(<Harness initialOpen={true} file={htmlFile('pricing-v3.html')} />);
    const dialog = findDialog();
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('New mockup');

    // Name pre-fill: extension stripped, lower-cased.
    const nameInput = findNameInput();
    expect(nameInput.value).toBe('pricing-v3');

    // Project select pre-selected to target.projectId.
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('p1');

    // FolderPicker trigger reflects the bound folder.
    const folderTrigger = document.querySelector(
      '[data-folder-picker-trigger]',
    ) as HTMLButtonElement;
    expect(folderTrigger.textContent).toContain('Hero');
  });

  it('happy path: submit fires start(...) then a success state pushes to the new mockup URL', () => {
    const onOpenChange = vi.fn();
    renderHarness(
      <Harness initialOpen={true} file={htmlFile('pricing-v3.html')} onOpenChange={onOpenChange} />,
    );

    const submit = findSubmitButton();
    expect(submit.textContent).toContain('Add mockup');

    act(() => {
      submit.click();
    });

    // Hook's mock transitioned to uploading; button reflects it.
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy.mock.calls[0][0]).toMatchObject({
      mode: 'add',
      name: 'pricing-v3',
      projectId: 'p1',
      folderId: 'hero',
    });

    // Now drive the hook into `success` and force a re-render — the
    // dialog's effect should pick it up and push to the new URL.
    act(() => {
      uploadState = {
        status: 'success',
        mockup: { id: 'mck_1', slug: 'pricing-v3' },
      };
      forceRender?.();
    });

    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush.mock.calls[0][0]).toBe('/projects/lumen-coffee/Hero/pricing-v3');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('field error (409 duplicate name): InputField data-state=error + message rendered', () => {
    renderHarness(<Harness initialOpen={true} file={htmlFile('pricing-v3.html')} />);
    act(() => {
      findSubmitButton().click();
    });
    act(() => {
      uploadState = {
        status: 'error',
        route: 'field',
        error: { kind: 'duplicate_name', detail: 'A mockup with this name already exists.' },
      };
      forceRender?.();
    });

    const field = document.querySelector('div[class*="field"]') as HTMLElement;
    expect(field.getAttribute('data-state')).toBe('error');
    expect(document.body.textContent).toContain('A mockup with this name already exists.');
    // Submit disabled while fieldError is set.
    expect(findSubmitButton().disabled).toBe(true);
  });

  it('global error (network): AlertBanner mounts and submit flips to "Retry"', () => {
    renderHarness(<Harness initialOpen={true} file={htmlFile('pricing-v3.html')} />);
    act(() => {
      findSubmitButton().click();
    });
    act(() => {
      uploadState = {
        status: 'error',
        route: 'global',
        error: { kind: 'network' },
      };
      forceRender?.();
    });

    const banner = document.querySelector('[data-status="error"]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Could not upload mockup');

    const submit = findSubmitButton();
    expect(submit.textContent?.trim()).toBe('Retry');
  });

  it('retry: clicking the Retry button calls start() again', () => {
    renderHarness(<Harness initialOpen={true} file={htmlFile()} />);
    act(() => findSubmitButton().click());
    act(() => {
      uploadState = {
        status: 'error',
        route: 'global',
        error: { kind: 'network' },
      };
      forceRender?.();
    });

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(findSubmitButton().textContent?.trim()).toBe('Retry');

    act(() => findSubmitButton().click());
    expect(startSpy).toHaveBeenCalledTimes(2);
  });

  it('replace mode: shows ReplaceToggle and POSTs to /version when submitted', () => {
    renderHarness(
      <Harness
        initialOpen={true}
        file={htmlFile('pricing-v3.html')}
        mode="replace"
        currentMockup={{ id: 'mck_existing', name: 'lumen-coffee-hero' }}
      />,
    );

    // ReplaceToggle visible.
    expect(document.querySelector('[role="radiogroup"]')).not.toBeNull();
    expect(document.body.textContent).toContain('lumen-coffee-hero');

    act(() => findSubmitButton().click());
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy.mock.calls[0][0]).toMatchObject({
      mode: 'replace',
      mockupId: 'mck_existing',
    });
  });

  it('cancel during upload: clicking Cancel calls abort() and onOpenChange(false)', () => {
    const onOpenChange = vi.fn();
    renderHarness(<Harness initialOpen={true} file={htmlFile()} onOpenChange={onOpenChange} />);
    act(() => findSubmitButton().click());
    expect(uploadState.status).toBe('uploading');

    act(() => findCancelButton().click());

    expect(abortSpy).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('uploading state: submit button reads "Uploading…" and is disabled', () => {
    renderHarness(<Harness initialOpen={true} file={htmlFile()} />);
    act(() => findSubmitButton().click());
    const submit = findSubmitButton();
    expect(submit.textContent?.trim()).toBe('Uploading…');
    expect(submit.disabled).toBe(true);
  });

  it('preview status reflects upload progress', () => {
    renderHarness(<Harness initialOpen={true} file={htmlFile()} />);
    act(() => findSubmitButton().click());
    act(() => {
      uploadState = { status: 'uploading', progress: 0.64 };
      forceRender?.();
    });
    expect(document.body.textContent).toContain('uploading 64%');
  });

  it('project switch: changing the project <select> refetches folders for the new project', () => {
    renderHarness(<Harness initialOpen={true} file={htmlFile('pricing-v3.html')} />);

    // Initial mount: dialog asked for p1's folders.
    expect(useFoldersCalls).toContain('p1');
    expect(lastUseFoldersCallProjectId).toBe('p1');

    // FolderPicker reflects the p1 fixture (Hero is pre-selected).
    let folderTrigger = document.querySelector('[data-folder-picker-trigger]') as HTMLButtonElement;
    expect(folderTrigger.textContent).toContain('Hero');

    // User switches the project select to p2.
    const select = document.querySelector('select') as HTMLSelectElement;
    act(() => {
      select.value = 'p2';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // The hook saw the new projectId — it re-keyed on the new project.
    expect(lastUseFoldersCallProjectId).toBe('p2');

    // Folder selection is cleared on project switch (the p1 folder is
    // no longer reachable). The picker now shows the project-root
    // placeholder.
    folderTrigger = document.querySelector('[data-folder-picker-trigger]') as HTMLButtonElement;
    expect(folderTrigger.textContent).not.toContain('Hero');

    // Open the popover and confirm the p2-specific folders are rendered.
    act(() => folderTrigger.click());
    const body = document.body.textContent ?? '';
    expect(body).toContain('Landing');
    expect(body).toContain('Docs');
    expect(body).not.toContain('Pricing'); // a p1-only folder
  });

  it('slug resolution: target with projectSlug + null projectId picks the matching project', () => {
    const target: NewMockupDialogTarget = {
      projectId: null,
      folderId: null,
      projectSlug: 'lumen-coffee',
      folderPath: ['Hero'],
    };
    renderHarness(
      <Harness initialOpen={true} file={htmlFile('pricing-v3.html')} target={target} />,
    );

    // The dialog resolves slug → id from the projects list ⇒ p1.
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('p1');
    // And asks useFolders for p1's tree.
    expect(lastUseFoldersCallProjectId).toBe('p1');

    // Folder is resolved from the URL folder names against the loaded
    // tree → 'Hero' folder pre-selected.
    const folderTrigger = document.querySelector(
      '[data-folder-picker-trigger]',
    ) as HTMLButtonElement;
    expect(folderTrigger.textContent).toContain('Hero');

    // Submit ⇒ the resolved ids ride along on the upload payload.
    act(() => findSubmitButton().click());
    expect(startSpy.mock.calls[0][0]).toMatchObject({
      mode: 'add',
      projectId: 'p1',
      folderId: 'hero',
    });
  });

  it('slug resolution: target.projectSlug that has no match keeps selectedProjectId null', () => {
    const target: NewMockupDialogTarget = {
      projectId: null,
      folderId: null,
      projectSlug: 'does-not-exist',
      folderPath: [],
    };
    renderHarness(
      <Harness initialOpen={true} file={htmlFile('pricing-v3.html')} target={target} />,
    );
    const select = document.querySelector('select') as HTMLSelectElement;
    // Unsorted option is the empty-string value.
    expect(select.value).toBe('');
  });
});

// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// Next router stubs — `ProjectSidebar` calls `useRouter()` for the
// post-save redirect; tests only need a no-op shape.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

import { ProjectSidebar } from '@/app/projects/ProjectSidebar';
import { ToastProvider } from '@/components/Toast/useToast';

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

function renderWithProviders(node: ReactNode): void {
  act(() => {
    root.render(createElement(ToastProvider, null, node));
  });
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

function htmlFile(name = 'index.html', size = 1024): File {
  const f = new File(['<!doctype html>'], name, { type: 'text/html' });
  Object.defineProperty(f, 'size', { value: size, configurable: true });
  return f;
}

function pngFile(): File {
  return new File(['x'], 'shot.png', { type: 'image/png' });
}

function renderSidebar(props: Partial<Parameters<typeof ProjectSidebar>[0]> = {}) {
  renderWithProviders(
    createElement(ProjectSidebar, {
      projects: [],
      orphanMockups: [],
      mockupNames: {},
      recentMockups: {},
      ...props,
    }),
  );
}

function findToastPill(): HTMLElement | null {
  return document.querySelector('[data-testid="toast-pill"]');
}

/**
 * Locate the desktop "New mockup" footer button. We scope to
 * `aria-label` rather than `textContent` because the DS-01 footer
 * pill renders an icon glyph alongside the label and we want the
 * lookup to stay stable if either side changes.
 */
function findNewMockupButton(): HTMLButtonElement {
  // The component renders the footer in both the desktop sidebar and
  // the mobile drawer. The desktop sidebar comes first in the tree, so
  // a single `querySelector` lands on it.
  const btn = container.querySelector(
    'button[aria-label="New mockup"]',
  ) as HTMLButtonElement | null;
  if (!btn) throw new Error('New mockup button not found');
  return btn;
}

function findHiddenFileInput(): HTMLInputElement {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement | null;
  if (!input) throw new Error('hidden file input not found');
  return input;
}

function findInlinePlusButton(): HTMLButtonElement {
  const btn = container.querySelector(
    'button[aria-label="New project"]',
  ) as HTMLButtonElement | null;
  if (!btn) throw new Error('inline + button not found');
  return btn;
}

describe('ProjectSidebar', () => {
  describe('footer "New mockup" button', () => {
    it('renders a button labelled "New mockup" instead of the legacy "New project"', () => {
      renderSidebar();
      const btn = findNewMockupButton();
      expect(btn.textContent).toContain('New mockup');
      // The legacy footer CTA used the `.btnNewProject` class. Guard
      // against a regression that leaves both buttons mounted
      // side-by-side by asserting that class is no longer present on
      // any element in the tree.
      const legacy = container.querySelector('[class*="btnNewProject"]');
      expect(legacy).toBeNull();
      // And the user-facing text "New Project" no longer appears
      // anywhere — it was the legacy footer label.
      expect(container.textContent ?? '').not.toContain('New Project');
    });

    it('clicking the button opens the hidden file picker', () => {
      renderSidebar();
      const input = findHiddenFileInput();
      const clickSpy = vi.spyOn(input, 'click');
      act(() => {
        findNewMockupButton().click();
      });
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('hidden file input accepts .html and .zip only', () => {
      renderSidebar();
      const input = findHiddenFileInput();
      expect(input.accept).toBe('.html,.zip');
      // Excluded from tab order — interaction is via the visible button.
      expect(input.getAttribute('tabindex')).toBe('-1');
    });

    it('calls onUploadFile with a validated HTML file on input change', () => {
      const onUploadFile = vi.fn();
      renderSidebar({ onUploadFile });
      const input = findHiddenFileInput();
      const file = htmlFile();
      Object.defineProperty(input, 'files', { value: makeFileList([file]), configurable: true });
      act(() => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(onUploadFile).toHaveBeenCalledTimes(1);
      expect(onUploadFile.mock.calls[0][0]).toBe(file);
    });

    it('multi-file selection: does not call onUploadFile; shows multi toast', () => {
      const onUploadFile = vi.fn();
      renderSidebar({ onUploadFile });
      const input = findHiddenFileInput();
      Object.defineProperty(input, 'files', {
        value: makeFileList([htmlFile('a.html'), htmlFile('b.html')]),
        configurable: true,
      });
      act(() => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(onUploadFile).not.toHaveBeenCalled();
      expect(findToastPill()?.textContent).toBe('Drop one file at a time.');
    });

    it('wrong type via input change: shows wrong-type toast', () => {
      const onUploadFile = vi.fn();
      renderSidebar({ onUploadFile });
      const input = findHiddenFileInput();
      Object.defineProperty(input, 'files', {
        value: makeFileList([pngFile()]),
        configurable: true,
      });
      act(() => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(onUploadFile).not.toHaveBeenCalled();
      expect(findToastPill()?.textContent).toBe('Only HTML or ZIP files are supported.');
    });

    it('too-large file via input change: shows too-large toast', () => {
      const onUploadFile = vi.fn();
      renderSidebar({ onUploadFile });
      const input = findHiddenFileInput();
      const big = htmlFile('big.html', 11 * 1024 * 1024);
      Object.defineProperty(input, 'files', { value: makeFileList([big]), configurable: true });
      act(() => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(onUploadFile).not.toHaveBeenCalled();
      expect(findToastPill()?.textContent).toBe('File too large (limit 10 MB).');
    });

    it('missing onUploadFile prop is tolerated (no-op on valid selection)', () => {
      // T18 will wire `onUploadFile`. Until then the sidebar must
      // render and validate without throwing when the prop is absent.
      renderSidebar({ onUploadFile: undefined });
      const input = findHiddenFileInput();
      const file = htmlFile();
      Object.defineProperty(input, 'files', { value: makeFileList([file]), configurable: true });
      expect(() => {
        act(() => {
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }).not.toThrow();
      expect(findToastPill()).toBeNull();
    });
  });

  describe('inline "Projects" label', () => {
    it('renders the Projects label inside the scrollable tree area, not in a fixed header', () => {
      renderSidebar();
      // The label is rendered by the shared <SectionHeader> recipe
      // whose CSS module emits a class prefixed with "header". We grep
      // the rendered DOM for an element containing "Projects" that
      // also carries that class so we exercise the contract: a real
      // SectionHeader sits inside the scroll wrapper.
      const labels = Array.from(container.querySelectorAll('[class*="header"]')).filter((el) =>
        (el.textContent ?? '').includes('Projects'),
      );
      expect(labels.length).toBeGreaterThan(0);
      const firstLabel = labels[0];
      expect(firstLabel.textContent).toContain('Projects');
      // The Sidebar component owns the scroll wrapper; the label must
      // be a descendant of an element whose class includes "scroll".
      let cursor: HTMLElement | null = firstLabel as HTMLElement;
      let inScroll = false;
      while (cursor) {
        if (cursor.className && /scroll/i.test(String(cursor.className))) {
          inScroll = true;
          break;
        }
        cursor = cursor.parentElement;
      }
      expect(inScroll).toBe(true);
    });

    it('inline + button is rendered next to the label and is focusable', () => {
      renderSidebar();
      const plus = findInlinePlusButton();
      // Must be a real button so keyboard activation works without
      // extra plumbing.
      expect(plus.tagName).toBe('BUTTON');
      expect(plus.getAttribute('aria-label')).toBe('New project');
    });
  });
});

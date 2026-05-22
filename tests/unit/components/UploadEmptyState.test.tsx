// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import { UploadEmptyState } from '@/components/EmptyState/UploadEmptyState';
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

function renderWithToast(node: ReactNode) {
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

function findLabel(): HTMLLabelElement {
  const label = container.querySelector('label');
  if (!label) throw new Error('dropzone label not found');
  return label as HTMLLabelElement;
}

function findInput(): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error('hidden file input not found');
  return input as HTMLInputElement;
}

function findToastPill(): HTMLElement | null {
  return document.querySelector('[data-testid="toast-pill"]');
}

function dispatchDrop(target: EventTarget, files: File[]): void {
  const ev = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'dataTransfer', {
    value: { types: ['Files'], files: makeFileList(files) },
    configurable: true,
  });
  target.dispatchEvent(ev);
}

function htmlFile(name = 'index.html', size = 1024): File {
  const f = new File(['<!doctype html>'], name, { type: 'text/html' });
  Object.defineProperty(f, 'size', { value: size, configurable: true });
  return f;
}

function pngFile(): File {
  return new File(['x'], 'shot.png', { type: 'image/png' });
}

describe('UploadEmptyState', () => {
  describe('contextual copy', () => {
    it('all-projects: title + sub', () => {
      const onFile = vi.fn();
      renderWithToast(createElement(UploadEmptyState, { context: 'all-projects', onFile }));
      const label = findLabel();
      expect(label.textContent).toContain('Drop your first mockup here');
      expect(label.textContent).toContain('or click to choose a file');
    });

    it('project: interpolates projectLabel into title + sub', () => {
      const onFile = vi.fn();
      renderWithToast(
        createElement(UploadEmptyState, {
          context: 'project',
          projectLabel: 'Lumen Coffee',
          onFile,
        }),
      );
      const label = findLabel();
      expect(label.textContent).toContain('No mockups in Lumen Coffee yet');
      expect(label.textContent).toContain('Drop an HTML or click to upload to this project');
    });

    it('folder: interpolates folderLabel into title + sub', () => {
      const onFile = vi.fn();
      renderWithToast(
        createElement(UploadEmptyState, {
          context: 'folder',
          projectLabel: 'Lumen Coffee',
          folderLabel: 'Hero',
          onFile,
        }),
      );
      const label = findLabel();
      expect(label.textContent).toContain('Hero is empty');
      expect(label.textContent).toContain('Drop an HTML or click to upload to this folder');
    });
  });

  describe('file picker', () => {
    it('renders a hidden <input type="file"> with accept=".html,.zip"', () => {
      renderWithToast(
        createElement(UploadEmptyState, { context: 'all-projects', onFile: vi.fn() }),
      );
      const input = findInput();
      expect(input.type).toBe('file');
      expect(input.accept).toBe('.html,.zip');
    });

    it('calls onFile with a validated HTML file on input change', () => {
      const onFile = vi.fn();
      renderWithToast(createElement(UploadEmptyState, { context: 'all-projects', onFile }));
      const input = findInput();
      const file = htmlFile();
      Object.defineProperty(input, 'files', { value: makeFileList([file]), configurable: true });
      act(() => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(onFile).toHaveBeenCalledTimes(1);
      expect(onFile.mock.calls[0][0]).toBe(file);
    });

    it('multi-file selection: does not call onFile; shows multi toast', () => {
      const onFile = vi.fn();
      renderWithToast(createElement(UploadEmptyState, { context: 'all-projects', onFile }));
      const input = findInput();
      Object.defineProperty(input, 'files', {
        value: makeFileList([htmlFile('a.html'), htmlFile('b.html')]),
        configurable: true,
      });
      act(() => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(onFile).not.toHaveBeenCalled();
      const toast = findToastPill();
      expect(toast?.textContent).toBe('Drop one file at a time.');
    });

    it('wrong type via input change: shows wrong-type toast', () => {
      const onFile = vi.fn();
      renderWithToast(createElement(UploadEmptyState, { context: 'all-projects', onFile }));
      const input = findInput();
      Object.defineProperty(input, 'files', {
        value: makeFileList([pngFile()]),
        configurable: true,
      });
      act(() => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(onFile).not.toHaveBeenCalled();
      expect(findToastPill()?.textContent).toBe('Only HTML or ZIP files are supported.');
    });

    it('too large via input change: shows too-large toast', () => {
      const onFile = vi.fn();
      renderWithToast(createElement(UploadEmptyState, { context: 'all-projects', onFile }));
      const input = findInput();
      const big = htmlFile('big.html', 11 * 1024 * 1024);
      Object.defineProperty(input, 'files', { value: makeFileList([big]), configurable: true });
      act(() => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(onFile).not.toHaveBeenCalled();
      expect(findToastPill()?.textContent).toBe('File too large (limit 10 MB).');
    });
  });

  describe('drag-drop', () => {
    it('drop of a valid HTML file → onFile called once', () => {
      const onFile = vi.fn();
      renderWithToast(createElement(UploadEmptyState, { context: 'all-projects', onFile }));
      const label = findLabel();
      const file = htmlFile();
      act(() => {
        dispatchDrop(label, [file]);
      });
      expect(onFile).toHaveBeenCalledTimes(1);
      expect(onFile.mock.calls[0][0]).toBe(file);
    });

    it('drop of a wrong-type file → onFile not called; toast shown', () => {
      const onFile = vi.fn();
      renderWithToast(createElement(UploadEmptyState, { context: 'all-projects', onFile }));
      const label = findLabel();
      act(() => {
        dispatchDrop(label, [pngFile()]);
      });
      expect(onFile).not.toHaveBeenCalled();
      expect(findToastPill()?.textContent).toBe('Only HTML or ZIP files are supported.');
    });

    it('dragover is prevented (so drop fires)', () => {
      renderWithToast(
        createElement(UploadEmptyState, { context: 'all-projects', onFile: vi.fn() }),
      );
      const label = findLabel();
      const ev = new Event('dragover', { bubbles: true, cancelable: true });
      label.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    });
  });

  describe('keyboard', () => {
    it('Enter on the label triggers a click on the hidden input', () => {
      renderWithToast(
        createElement(UploadEmptyState, { context: 'all-projects', onFile: vi.fn() }),
      );
      const label = findLabel();
      const input = findInput();
      const clickSpy = vi.spyOn(input, 'click');
      label.focus();
      act(() => {
        label.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('Space on the label triggers a click on the hidden input', () => {
      renderWithToast(
        createElement(UploadEmptyState, { context: 'all-projects', onFile: vi.fn() }),
      );
      const label = findLabel();
      const input = findInput();
      const clickSpy = vi.spyOn(input, 'click');
      label.focus();
      act(() => {
        label.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      });
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('label is tabbable (tabindex="0") with role="button"', () => {
      renderWithToast(
        createElement(UploadEmptyState, { context: 'all-projects', onFile: vi.fn() }),
      );
      const label = findLabel();
      expect(label.getAttribute('tabindex')).toBe('0');
      expect(label.getAttribute('role')).toBe('button');
    });

    it('hidden input is excluded from tab order (tabindex="-1")', () => {
      renderWithToast(
        createElement(UploadEmptyState, { context: 'all-projects', onFile: vi.fn() }),
      );
      const input = findInput();
      expect(input.getAttribute('tabindex')).toBe('-1');
    });
  });
});

// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/shortcuts/platform', () => ({ useIsMac: () => true }));

import { type UseDraftKeyboardArgs, useDraftKeyboard } from '@/hooks/useDraftKeyboard';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  document.body.innerHTML = '';
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

function fire(target: EventTarget, init: KeyboardEventInit) {
  const e = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  return e;
}

function makeTextareaRef() {
  const ta = document.createElement('textarea');
  document.body.appendChild(ta);
  ta.setAttribute('data-draft-card-root', '');
  return { ta, ref: { current: ta } };
}

function mount(args: UseDraftKeyboardArgs) {
  function Inner() {
    useDraftKeyboard(args);
    useEffect(() => {}, []);
    return null;
  }
  act(() => {
    root.render(createElement(Inner));
  });
}

describe('useDraftKeyboard', () => {
  it('N opens draft when no input is focused', () => {
    const onOpen = vi.fn();
    mount({
      draft: null,
      onOpen,
      onCancel: vi.fn(),
      onSend: vi.fn(),
      onSave: vi.fn(),
      textareaRef: { current: null },
    });
    fire(document, { key: 'n' });
    expect(onOpen).toHaveBeenCalled();
  });

  it('N does NOT fire when an input is focused', () => {
    const onOpen = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    mount({
      draft: null,
      onOpen,
      onCancel: vi.fn(),
      onSend: vi.fn(),
      onSave: vi.fn(),
      textareaRef: { current: null },
    });
    fire(document, { key: 'n' });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('Esc fires onCancel when textarea is focused and draft exists', () => {
    const { ta, ref } = makeTextareaRef();
    ta.focus();
    const onCancel = vi.fn();
    mount({
      draft: { body: '', pins: [], lastSavedAt: null, hasUnsavedChanges: false },
      onOpen: vi.fn(),
      onCancel,
      onSend: vi.fn(),
      onSave: vi.fn(),
      textareaRef: ref,
    });
    fire(ta, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('Cmd+Enter fires onSend when textarea is focused', () => {
    const { ta, ref } = makeTextareaRef();
    ta.focus();
    const onSend = vi.fn();
    mount({
      draft: { body: 'x', pins: [], lastSavedAt: null, hasUnsavedChanges: true },
      onOpen: vi.fn(),
      onCancel: vi.fn(),
      onSend,
      onSave: vi.fn(),
      textareaRef: ref,
    });
    fire(ta, { key: 'Enter', metaKey: true });
    expect(onSend).toHaveBeenCalled();
  });

  it('Cmd+S fires onSave AND preventDefaults', () => {
    const { ta, ref } = makeTextareaRef();
    ta.focus();
    const onSave = vi.fn();
    mount({
      draft: { body: 'x', pins: [], lastSavedAt: null, hasUnsavedChanges: true },
      onOpen: vi.fn(),
      onCancel: vi.fn(),
      onSend: vi.fn(),
      onSave,
      textareaRef: ref,
    });
    const e = fire(ta, { key: 's', metaKey: true });
    expect(onSave).toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(true);
  });
});

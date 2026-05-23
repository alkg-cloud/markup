// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import { DraftCard, type DraftCardProps } from '@/components/DraftCard/DraftCard';
import type { Draft } from '@/components/MockupViewer/draft-types';
import type { AnchorRecord } from '@/lib/annotation/service';

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
});

function baseDraft(overrides: Partial<Draft> = {}): Draft {
  return { body: '', pins: [], lastSavedAt: null, hasUnsavedChanges: false, ...overrides };
}

function noop() {}

function renderDraftCard(props: Partial<DraftCardProps> = {}) {
  const merged: DraftCardProps = {
    draft: baseDraft(),
    status: 'unsaved',
    onBodyChange: noop,
    onCancel: noop,
    onSave: noop,
    onSend: noop,
    ...props,
  };
  act(() => {
    root.render(createElement(DraftCard, merged));
  });
  return container.querySelector('[data-draft-card-root]') as HTMLElement;
}

/** Find a button by its rendered text content OR aria-label (icon-only buttons
 *  like Send have no text). Case-sensitive substring match for strings; regex
 *  otherwise. Both surfaces are checked because the action row mixes labeled
 *  buttons (Cancel, Draft) with icon-only ones (Send / Retry). */
function findButton(rootEl: ParentNode, text: string | RegExp): HTMLButtonElement | null {
  const buttons = Array.from(rootEl.querySelectorAll('button'));
  const matches = (candidate: string) =>
    typeof text === 'string' ? candidate.includes(text) : text.test(candidate);
  for (const b of buttons) {
    const t = (b.textContent ?? '').trim();
    const label = (b.getAttribute('aria-label') ?? '').trim();
    if (matches(t) || matches(label)) return b as HTMLButtonElement;
  }
  return null;
}

describe('DraftCard', () => {
  it('renders the DRAFT marker', () => {
    const rootEl = renderDraftCard();
    const marker = rootEl.querySelector('span');
    // The first <span> inside the header is the marker with text "Draft".
    const allText = Array.from(rootEl.querySelectorAll('span')).map((s) => s.textContent);
    expect(allText).toContain('Draft');
    expect(marker).not.toBeNull();
  });

  it('Send button is disabled when body is empty', () => {
    const rootEl = renderDraftCard();
    const send = findButton(rootEl, /Send/);
    expect(send).not.toBeNull();
    expect(send?.disabled).toBe(true);
  });

  it('Send button is enabled when body is typing (hasUnsavedChanges true)', () => {
    const rootEl = renderDraftCard({
      draft: baseDraft({ body: 'x', hasUnsavedChanges: true }),
    });
    const send = findButton(rootEl, /Send/);
    expect(send).not.toBeNull();
    expect(send?.disabled).toBe(false);
  });

  it('Send button is disabled when body is over-limit (>10 000 chars)', () => {
    const long = 'a'.repeat(10_001);
    const rootEl = renderDraftCard({
      draft: baseDraft({ body: long, hasUnsavedChanges: true }),
    });
    const send = findButton(rootEl, /Send/);
    expect(send).not.toBeNull();
    expect(send?.disabled).toBe(true);
  });

  it('Save (Draft) button is disabled when status="saved" (no unsaved changes)', () => {
    const rootEl = renderDraftCard({
      draft: baseDraft({ body: 'x', lastSavedAt: Date.now(), hasUnsavedChanges: false }),
      status: 'saved',
    });
    // The Save button text is just "Draft" (shortcut moved to data-tooltip).
    // The DRAFT marker is a <span>, not a button, so this resolves uniquely.
    const draftBtn = findButton(rootEl, /^Draft$/);
    expect(draftBtn).not.toBeNull();
    expect(draftBtn?.disabled).toBe(true);
  });

  it('Send aria-label becomes "Retry" when status="error"', () => {
    const rootEl = renderDraftCard({
      draft: baseDraft({ body: 'x', hasUnsavedChanges: true }),
      status: 'error',
    });
    const retry = findButton(rootEl, /Retry/);
    expect(retry).not.toBeNull();
    expect(retry?.getAttribute('aria-label')).toBe('Retry');
    // The submit button is icon-only; no labeled Send remains.
    const buttons = Array.from(rootEl.querySelectorAll('button'));
    const sendByLabel = buttons.filter((b) => (b.getAttribute('aria-label') ?? '') === 'Send');
    expect(sendByLabel.length).toBe(0);
  });

  it('Cancel discards immediately when draft is empty (calls onCancel directly)', () => {
    const onCancel = vi.fn();
    const rootEl = renderDraftCard({ onCancel });
    const cancel = findButton(rootEl, 'Cancel');
    expect(cancel).not.toBeNull();
    act(() => {
      cancel?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
    // The empty-state Cancel is a bare button — no AlertDialog content in the DOM.
    expect(document.body.textContent).not.toContain('Discard draft?');
  });

  it('Cancel opens AlertDialog when non-empty; clicking Discard calls onCancel', async () => {
    const onCancel = vi.fn();
    const rootEl = renderDraftCard({
      draft: baseDraft({ body: 'x', hasUnsavedChanges: true }),
      onCancel,
    });
    const cancel = findButton(rootEl, 'Cancel');
    expect(cancel).not.toBeNull();

    // Radix Trigger toggles the dialog open from a click. Wrap in act and
    // yield a microtask tick to let the Portal mount.
    act(() => {
      cancel?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    // AlertDialog mounts in a Portal — query from document, not container.
    const title = document.querySelector('[role="alertdialog"]');
    expect(title).not.toBeNull();
    expect(document.body.textContent).toContain('Discard draft?');
    expect(onCancel).not.toHaveBeenCalled();

    // Click the Discard action.
    const discard = findButton(document, 'Discard');
    expect(discard).not.toBeNull();
    act(() => {
      discard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('writes the correct data attributes (status/body-state/pin-count/density)', () => {
    const maxPins: AnchorRecord[] = Array.from({ length: 20 }, (_, i) => ({
      x: i,
      y: i,
      label: String(i),
    })) as unknown as AnchorRecord[];
    const rootEl = renderDraftCard({
      draft: baseDraft({ body: 'x', pins: maxPins, hasUnsavedChanges: true }),
      status: 'saving',
      density: 'comfortable',
    });
    expect(rootEl.dataset.status).toBe('saving');
    expect(rootEl.dataset.bodyState).toBe('typing');
    expect(rootEl.dataset.pinCount).toBe('max');
    expect(rootEl.dataset.density).toBe('comfortable');
  });
});

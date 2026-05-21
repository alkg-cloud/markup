/** @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NewProjectDialog } from '@/components/NewProjectDialog/NewProjectDialog';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom doesn't implement PointerEvent / scrollIntoView, which Radix's
// Dialog primitive relies on internally (DismissableLayer). Polyfill
// the minimum surface — matches the harness in NewMockupDialog.test.tsx.
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

describe('NewProjectDialog labels', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders sentence-case labels, a Create button, and a URL-safe placeholder', () => {
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: true,
          onClose: () => {},
          onSaved: () => {},
        }),
      );
    });
    // Labels use the catalog's 10 px uppercase treatment via CSS — the
    // *content* itself is sentence-case so screen readers + manual
    // copy-paste read naturally.
    expect(document.body.textContent).toContain('Project name');
    expect(document.body.textContent).toContain('Icon');
    // Primary action drops the redundant noun (title already says "New
    // Project" / "Edit Project").
    expect(document.body.textContent).toContain('Create');
    const input = document.querySelector('input[placeholder]');
    // Placeholder uses URL-safe punctuation (hyphen, not space) — the
    // name itself becomes a URL path segment.
    expect(input?.getAttribute('placeholder')).toBe('My-Project');
    act(() => root.unmount());
  });
});

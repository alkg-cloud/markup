/** @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom doesn't implement PointerEvent / scrollIntoView, which Radix's
// Dialog primitive (DismissableLayer + FocusScope) relies on.
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

// Capture toast.show() calls so the success-path test can assert the
// success toast was triggered without mounting the real ToastProvider.
const toastShow = vi.fn();
vi.mock('@/components/Toast/useToast', async () => {
  const actual = await vi.importActual<typeof import('@/components/Toast/useToast')>(
    '@/components/Toast/useToast',
  );
  return {
    ...actual,
    useToast: () => ({ toasts: [], show: toastShow }),
  };
});

import { NewProjectDialog } from '@/components/NewProjectDialog/NewProjectDialog';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  toastShow.mockReset();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

describe('NewProjectDialog (Radix migration)', () => {
  it('mounts the dialog when open=true', () => {
    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: true,
          onClose: vi.fn(),
          onSaved: vi.fn(),
        }),
      );
    });
    // Radix renders into a portal, so query off `document` rather than
    // `container`. The dialog content is identified by role.
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('renders nothing observable when open=false', () => {
    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: false,
          onClose: vi.fn(),
          onSaved: vi.fn(),
        }),
      );
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders project name input', () => {
    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: true,
          onClose: vi.fn(),
          onSaved: vi.fn(),
        }),
      );
    });
    expect(document.body.textContent).toContain('Project name');
    expect(document.querySelector('input[name="name"]')).not.toBeNull();
  });

  it('renders Cancel and Create buttons', () => {
    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: true,
          onClose: vi.fn(),
          onSaved: vi.fn(),
        }),
      );
    });
    const buttons = Array.from(document.querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent?.trim() === 'Cancel')).toBe(true);
    expect(buttons.some((b) => b.textContent?.trim() === 'Create')).toBe(true);
  });

  it('renders IconPicker inside dialog', () => {
    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: true,
          onClose: vi.fn(),
          onSaved: vi.fn(),
        }),
      );
    });
    // IconPicker renders tabs: Code, Brands, UI, Emoji
    expect(document.body.textContent).toContain('Code');
    expect(document.body.textContent).toContain('Brands');
  });

  it('renders icon search input inside the dialog', () => {
    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: true,
          onClose: vi.fn(),
          onSaved: vi.fn(),
        }),
      );
    });
    // IconPicker's "Search icons…" placeholder.
    const placeholders = Array.from(document.querySelectorAll('input')).map((i) =>
      i.getAttribute('placeholder'),
    );
    expect(placeholders.some((p) => p?.startsWith('Search icons'))).toBe(true);
  });

  it('does not render "Browse all icons" link', () => {
    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: true,
          onClose: vi.fn(),
          onSaved: vi.fn(),
        }),
      );
    });
    expect(document.body.textContent).not.toContain('Browse all icons');
  });

  it('switches title to "Edit Project" when editing', () => {
    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: true,
          onClose: vi.fn(),
          onSaved: vi.fn(),
          project: { id: 'p1', name: 'Existing', slug: 'existing', icon: null },
        }),
      );
    });
    expect(document.body.textContent).toContain('Edit Project');
    // Primary action label flips from "Create" to "Update".
    const buttons = Array.from(document.querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent?.trim() === 'Update')).toBe(true);
  });

  it('shows the validation error message for an invalid character', () => {
    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: true,
          onClose: vi.fn(),
          onSaved: vi.fn(),
        }),
      );
    });
    const input = document.querySelector('input[name="name"]') as HTMLInputElement;
    // Simulate typing an invalid character (space is forbidden).
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(input, 'bad name');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // The inline validator surfaces a message about the offending char.
    expect(document.body.textContent).toMatch(/not allowed/);
    // The Field wrapper carries data-state="error".
    const field = document.querySelector('[name="name"]')?.closest('[data-state]');
    expect(field?.getAttribute('data-state')).toBe('error');
  });

  it('submit success: POSTs to /api/projects, fires toast, calls onSaved + onClose', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'p-new', slug: 'lumen' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: true,
          onClose,
          onSaved,
        }),
      );
    });

    // Type a valid name.
    const input = document.querySelector('input[name="name"]') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(input, 'lumen');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Click the submit button.
    const submit = Array.from(document.querySelectorAll('button')).find(
      (b) => b.getAttribute('type') === 'submit',
    ) as HTMLButtonElement;
    expect(submit).toBeDefined();
    await act(async () => {
      submit.click();
    });
    // Let the fetch promise + state updates flush.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/projects');
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ name: 'lumen' });

    expect(toastShow).toHaveBeenCalledWith('Project created');
    expect(onSaved).toHaveBeenCalledWith({ id: 'p-new', slug: 'lumen' });
    expect(onClose).toHaveBeenCalled();
  });
});

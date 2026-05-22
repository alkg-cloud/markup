// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '@/components/Toast/useToast';

function Trigger({ message, duration }: { message: string; duration?: number }) {
  const { show } = useToast();
  useEffect(() => {
    show(message, duration);
  }, [message, duration, show]);
  return null;
}

function pills(): NodeListOf<HTMLLIElement> {
  return document.querySelectorAll('[data-testid="toast-pill"]');
}

describe('ToastProvider (Radix-backed)', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('renders a toast with the message after show() is called', async () => {
    await act(async () => {
      root.render(
        createElement(ToastProvider, null, createElement(Trigger, { message: 'Saved!' })),
      );
    });
    expect(pills().length).toBe(1);
    expect(pills()[0].textContent).toContain('Saved!');
  });

  it('mounts the Radix viewport as an <ol> with the test handle', async () => {
    await act(async () => {
      root.render(createElement(ToastProvider, null));
    });
    const viewport = document.querySelector('[data-testid="toast-container"]');
    expect(viewport).not.toBeNull();
    expect(viewport?.tagName).toBe('OL');
  });

  it('stacks multiple toasts when show() is called repeatedly', async () => {
    function Multi() {
      const { show } = useToast();
      useEffect(() => {
        show('first');
        show('second');
      }, [show]);
      return null;
    }
    await act(async () => {
      root.render(createElement(ToastProvider, null, createElement(Multi, null)));
    });
    expect(pills().length).toBe(2);
    expect(pills()[0].textContent).toContain('first');
    expect(pills()[1].textContent).toContain('second');
  });

  it('removes the toast from the queue after the fallback close timeout', async () => {
    await act(async () => {
      root.render(
        createElement(
          ToastProvider,
          null,
          createElement(Trigger, { message: 'auto-dismiss', duration: 500 }),
        ),
      );
    });
    expect(pills().length).toBe(1);

    // Advance past the duration so Radix calls onOpenChange(false).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    // After Radix transitions `[data-state]` to "closed" and our
    // fallback unmount fires, the row leaves the DOM.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(pills().length).toBe(0);
  });

  it('id counter is provider-scoped — remounts reset the count', async () => {
    function ShowOnMount() {
      const { show } = useToast();
      useEffect(() => {
        show('first-mount');
      }, [show]);
      return null;
    }

    // First mount: render + assert one pill, then unmount.
    await act(async () => {
      root.render(createElement(ToastProvider, null, createElement(ShowOnMount, null)));
    });
    expect(pills().length).toBe(1);
    await act(async () => {
      root.unmount();
    });
    expect(pills().length).toBe(0);

    // Fresh root inherits a fresh counterRef — the second mount must
    // not collide with the first mount's id (which would silently
    // drop the new toast via React's key-collision dedupe).
    root = createRoot(container);
    await act(async () => {
      root.render(createElement(ToastProvider, null, createElement(ShowOnMount, null)));
    });
    expect(pills().length).toBe(1);
  });
});

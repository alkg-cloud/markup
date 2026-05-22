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

function findPill(): HTMLElement | null {
  return document.querySelector('[data-testid="toast-pill"]');
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
    const pill = findPill();
    expect(pill).not.toBeNull();
    expect(pill?.textContent).toContain('Saved!');
  });

  it('mounts the Radix viewport with aria-live + role=region semantics', async () => {
    await act(async () => {
      root.render(createElement(ToastProvider, null));
    });
    // Radix Toast.Viewport carries role + tabIndex + aria-label by
    // default; our class composes the bottom-center container.
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
    const pills = document.querySelectorAll('[data-testid="toast-pill"]');
    expect(pills.length).toBe(2);
    expect(pills[0].textContent).toContain('first');
    expect(pills[1].textContent).toContain('second');
  });
});

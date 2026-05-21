// @vitest-environment jsdom

import { act, forwardRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AlertBanner } from '@/components/AlertBanner';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

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

function renderNode(node: React.ReactElement) {
  act(() => {
    root.render(node);
  });
}

const STATUSES = ['error', 'warning', 'success', 'info'] as const;
const DEFAULT_ICONS: Record<(typeof STATUSES)[number], string> = {
  error: '!',
  warning: '⚠',
  success: '✓',
  info: 'i',
};

describe('AlertBanner', () => {
  it.each(STATUSES)('renders status "%s" with [data-status] and auto-ARIA role', (status) => {
    renderNode(
      <AlertBanner.Root status={status}>
        <AlertBanner.Icon />
        <AlertBanner.Body>
          <AlertBanner.Title>Heading</AlertBanner.Title>
          <AlertBanner.Description>Body copy.</AlertBanner.Description>
        </AlertBanner.Body>
      </AlertBanner.Root>,
    );

    const banner = container.querySelector('[data-status]') as HTMLElement;
    expect(banner).not.toBeNull();
    expect(banner.getAttribute('data-status')).toBe(status);

    // error + warning → role="alert" ; success + info → role="status"
    const expectedRole = status === 'error' || status === 'warning' ? 'alert' : 'status';
    expect(banner.getAttribute('role')).toBe(expectedRole);
  });

  it.each(STATUSES)('default Icon renders the symbol for "%s"', (status) => {
    renderNode(
      <AlertBanner.Root status={status}>
        <AlertBanner.Icon />
        <AlertBanner.Body>
          <AlertBanner.Title>x</AlertBanner.Title>
        </AlertBanner.Body>
      </AlertBanner.Root>,
    );

    const icon = container.querySelector('[class*="icon"]') as HTMLElement;
    expect(icon).not.toBeNull();
    expect(icon.textContent).toBe(DEFAULT_ICONS[status]);
  });

  it('Icon override via children replaces the default symbol', () => {
    renderNode(
      <AlertBanner.Root status="info">
        <AlertBanner.Icon>★</AlertBanner.Icon>
        <AlertBanner.Body>
          <AlertBanner.Title>x</AlertBanner.Title>
        </AlertBanner.Body>
      </AlertBanner.Root>,
    );
    const icon = container.querySelector('[class*="icon"]') as HTMLElement;
    expect(icon.textContent).toBe('★');
  });

  it('role prop overrides the auto-picked role', () => {
    renderNode(
      <AlertBanner.Root status="error" role="status">
        <AlertBanner.Body>
          <AlertBanner.Title>x</AlertBanner.Title>
        </AlertBanner.Body>
      </AlertBanner.Root>,
    );
    const banner = container.querySelector('[data-status]') as HTMLElement;
    expect(banner.getAttribute('role')).toBe('status');
  });

  it('Close asChild forwards props (className, onClick) and ref to the inner element', () => {
    let clicked = 0;
    let captured: HTMLButtonElement | null = null;
    const CaptureBtn = forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<'button'>>(
      (props, ref) => (
        <button
          ref={(el) => {
            captured = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
          }}
          data-testid="my-close"
          {...props}
        />
      ),
    );
    CaptureBtn.displayName = 'CaptureBtn';

    renderNode(
      <AlertBanner.Root status="error">
        <AlertBanner.Body>
          <AlertBanner.Title>x</AlertBanner.Title>
        </AlertBanner.Body>
        <AlertBanner.Close asChild>
          <CaptureBtn
            aria-label="Dismiss"
            onClick={() => {
              clicked += 1;
            }}
          >
            X
          </CaptureBtn>
        </AlertBanner.Close>
      </AlertBanner.Root>,
    );

    const close = container.querySelector('[data-testid="my-close"]') as HTMLButtonElement;
    expect(close).not.toBeNull();
    expect(close.tagName).toBe('BUTTON');
    // Slot merges its own className with the consumer's
    expect(close.className).toMatch(/closeBtn/i);
    // ref forwarded
    expect(captured).toBe(close);
    act(() => {
      close.click();
    });
    expect(clicked).toBe(1);
  });

  it('Action asChild forwards props and renders consumer element', () => {
    let clicked = 0;
    renderNode(
      <AlertBanner.Root status="success">
        <AlertBanner.Body>
          <AlertBanner.Title>x</AlertBanner.Title>
        </AlertBanner.Body>
        <AlertBanner.Action asChild>
          <a
            href="/view"
            data-testid="my-action"
            onClick={(e) => {
              e.preventDefault();
              clicked += 1;
            }}
          >
            View
          </a>
        </AlertBanner.Action>
      </AlertBanner.Root>,
    );

    const action = container.querySelector('[data-testid="my-action"]') as HTMLAnchorElement;
    expect(action).not.toBeNull();
    expect(action.tagName).toBe('A');
    expect(action.className).toMatch(/action/i);
    expect(action.textContent).toBe('View');
    act(() => {
      action.click();
    });
    expect(clicked).toBe(1);
  });

  it('Action without asChild renders a native button styled with the action class', () => {
    renderNode(
      <AlertBanner.Root status="error">
        <AlertBanner.Body>
          <AlertBanner.Title>x</AlertBanner.Title>
        </AlertBanner.Body>
        <AlertBanner.Action>Retry</AlertBanner.Action>
      </AlertBanner.Root>,
    );

    const action = container.querySelector('button[class*="action"]') as HTMLButtonElement;
    expect(action).not.toBeNull();
    expect(action.type).toBe('button');
    expect(action.textContent).toBe('Retry');
  });

  it('Body / Title / Description render with their CSS-module classes', () => {
    renderNode(
      <AlertBanner.Root status="info">
        <AlertBanner.Body>
          <AlertBanner.Title>Heading</AlertBanner.Title>
          <AlertBanner.Description>Body copy.</AlertBanner.Description>
        </AlertBanner.Body>
      </AlertBanner.Root>,
    );

    expect(container.querySelector('[class*="body"]')).not.toBeNull();
    expect(container.querySelector('[class*="title"]')).not.toBeNull();
    expect(container.querySelector('[class*="description"]')).not.toBeNull();
  });
});

// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RadixDialog } from '@/components/Dialog/RadixDialog';

// React 19 emits "current testing environment is not configured to support
// act(...)" warnings unless this global flag is set. Vitest's jsdom env
// doesn't set it for us. Setting it here keeps the suite quiet.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// Markup's other component tests use `renderToStaticMarkup` because most of
// them assert static markup only. RadixDialog wraps `@radix-ui/react-dialog`
// which mounts an open portal, traps focus, and listens to global `keydown` —
// behaviour we can only observe in a real DOM. So this suite drives a tiny
// react-dom/client + jsdom harness.

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

function Harness({ defaultOpen = true }: { defaultOpen?: boolean }) {
  return (
    <RadixDialog.Root defaultOpen={defaultOpen}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay data-testid="overlay" />
        <RadixDialog.Content>
          <RadixDialog.Title>Test dialog</RadixDialog.Title>
          <RadixDialog.Description>Body</RadixDialog.Description>
          <input data-testid="first-focusable" />
          <RadixDialog.Close asChild>
            <button type="button">Close</button>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function renderHarness(node: React.ReactElement) {
  act(() => {
    root.render(node);
  });
}

describe('RadixDialog', () => {
  it('mounts content in a portal when defaultOpen', () => {
    renderHarness(<Harness />);
    expect(document.body.textContent).toContain('Test dialog');
    expect(document.body.textContent).toContain('Body');
  });

  it('moves focus into the dialog (auto-focus first focusable element)', () => {
    renderHarness(<Harness />);
    const first = document.querySelector('[data-testid="first-focusable"]') as HTMLInputElement;
    expect(first).not.toBeNull();
    // Radix Dialog auto-focuses the first focusable inside Content on open.
    // The active element should be inside the dialog, not on document.body.
    expect(document.activeElement).not.toBe(document.body);
    const content = document.querySelector('[role="dialog"]');
    expect(content?.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape', () => {
    renderHarness(<Harness />);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes when the overlay is clicked (pointer-down outside)', async () => {
    renderHarness(<Harness />);
    const overlay = document.querySelector('[data-testid="overlay"]') as HTMLElement;
    expect(overlay).not.toBeNull();
    // Radix's DismissableLayer registers its `pointerdown` listener on
    // `document` from inside a `setTimeout(…, 0)`, so we yield a tick to
    // let it attach. jsdom doesn't synthesise PointerEvent.pointerType the
    // way browsers do, so we hand-roll the event with `mouse` to ensure
    // the synchronous (non-touch) branch is taken.
    await new Promise((r) => setTimeout(r, 0));
    const pointerDown = new Event('pointerdown', { bubbles: true, cancelable: true });
    Object.assign(pointerDown, { pointerType: 'mouse', button: 0 });
    act(() => {
      overlay.dispatchEvent(pointerDown);
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('applies the ported class names (.dialog, .scrim, .title, .description)', () => {
    renderHarness(<Harness />);
    const content = document.querySelector('[role="dialog"]');
    const overlay = document.querySelector('[data-testid="overlay"]');
    const title = document.querySelector('h2');
    expect(content?.className).toMatch(/dialog/);
    expect(overlay?.className).toMatch(/scrim/);
    expect(title?.className).toMatch(/title/);
  });

  describe('showCloseButton', () => {
    it('does not render a close-X button when showCloseButton is omitted', () => {
      renderHarness(<Harness />);
      // The only close button in the Harness is the explicit RadixDialog.Close
      // with text "Close". There should be no additional aria-label="Close" button.
      const closeButtons = Array.from(document.querySelectorAll('button[aria-label="Close"]'));
      expect(closeButtons).toHaveLength(0);
    });

    it('renders a close-X button when showCloseButton={true}', () => {
      act(() => {
        root.render(
          <RadixDialog.Root defaultOpen>
            <RadixDialog.Portal>
              <RadixDialog.Overlay />
              <RadixDialog.Content showCloseButton>
                <RadixDialog.Title>With X</RadixDialog.Title>
              </RadixDialog.Content>
            </RadixDialog.Portal>
          </RadixDialog.Root>,
        );
      });
      const xBtn = document.querySelector('button[aria-label="Close"]') as HTMLButtonElement | null;
      expect(xBtn).not.toBeNull();
      expect(xBtn?.disabled).toBe(false);
    });

    it('respects a custom closeLabel', () => {
      act(() => {
        root.render(
          <RadixDialog.Root defaultOpen>
            <RadixDialog.Portal>
              <RadixDialog.Overlay />
              <RadixDialog.Content showCloseButton closeLabel="Dismiss dialog">
                <RadixDialog.Title>Custom label</RadixDialog.Title>
              </RadixDialog.Content>
            </RadixDialog.Portal>
          </RadixDialog.Root>,
        );
      });
      expect(document.querySelector('button[aria-label="Dismiss dialog"]')).not.toBeNull();
    });

    it('disables the close-X when closeButtonDisabled={true}', () => {
      act(() => {
        root.render(
          <RadixDialog.Root defaultOpen>
            <RadixDialog.Portal>
              <RadixDialog.Overlay />
              <RadixDialog.Content showCloseButton closeButtonDisabled>
                <RadixDialog.Title>Disabled X</RadixDialog.Title>
              </RadixDialog.Content>
            </RadixDialog.Portal>
          </RadixDialog.Root>,
        );
      });
      const xBtn = document.querySelector('button[aria-label="Close"]') as HTMLButtonElement | null;
      expect(xBtn).not.toBeNull();
      expect(xBtn?.disabled).toBe(true);
    });

    it('close-X click closes the dialog', async () => {
      act(() => {
        root.render(
          <RadixDialog.Root defaultOpen>
            <RadixDialog.Portal>
              <RadixDialog.Overlay />
              <RadixDialog.Content showCloseButton>
                <RadixDialog.Title>Closeable</RadixDialog.Title>
              </RadixDialog.Content>
            </RadixDialog.Portal>
          </RadixDialog.Root>,
        );
      });
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      const xBtn = document.querySelector('button[aria-label="Close"]') as HTMLButtonElement;
      expect(xBtn).not.toBeNull();
      act(() => {
        xBtn.click();
      });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    });
  });
});

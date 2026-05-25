// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import { ViewportHandles } from '@/components/MockupViewer/ViewportHandles';
import { DEFAULT_VIEWPORT, type ViewportState } from '@/components/MockupViewer/viewport-presets';

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

function render(viewport: ViewportState, setViewport = vi.fn()) {
  act(() => {
    root.render(
      createElement(
        'div',
        { style: { width: 800, height: 600, position: 'relative' } },
        createElement(ViewportHandles, { viewport, setViewport }),
      ),
    );
  });
  return { setViewport };
}

describe('ViewportHandles', () => {
  it('renders nothing in Fit mode', () => {
    render(DEFAULT_VIEWPORT);
    expect(container.querySelectorAll('[role="separator"]')).toHaveLength(0);
  });

  const CUSTOM: ViewportState = {
    mode: 'custom',
    width: 640,
    height: 480,
    orientation: 'portrait',
  };

  it('renders all three handles when mode === custom', () => {
    render(CUSTOM);
    const seps = container.querySelectorAll('[role="separator"]');
    expect(seps).toHaveLength(3);
    expect(seps[0].getAttribute('aria-orientation')).toBe('vertical');
    expect(seps[1].getAttribute('aria-orientation')).toBe('horizontal');
    expect(seps[2].getAttribute('aria-orientation')).toBeNull();
  });

  it.each([
    'desktop',
    'tablet',
    'mobile',
  ] as const)('renders all three handles in %s mode', (mode) => {
    render({ mode, width: 1024, height: 768, orientation: 'portrait' });
    expect(container.querySelectorAll('[role="separator"]')).toHaveLength(3);
  });

  it('handles are keyboard-focusable', () => {
    render(CUSTOM);
    const seps = Array.from(container.querySelectorAll('[role="separator"]'));
    for (const s of seps) {
      expect(s.getAttribute('tabindex')).toBe('0');
    }
  });

  it('Arrow Right on right handle nudges width by 8', () => {
    const setViewport = vi.fn();
    render(CUSTOM, setViewport);
    const right = container.querySelector('[aria-orientation="vertical"]') as HTMLDivElement;
    act(() => {
      right.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });
    expect(setViewport).toHaveBeenCalledWith(expect.objectContaining({ width: 648, height: 480 }));
  });

  it('Shift+Arrow Right nudges width by 32', () => {
    const setViewport = vi.fn();
    render(CUSTOM, setViewport);
    const right = container.querySelector('[aria-orientation="vertical"]') as HTMLDivElement;
    act(() => {
      right.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(setViewport).toHaveBeenCalledWith(expect.objectContaining({ width: 672 }));
  });

  it('ArrowLeft at min width clamps to 240', () => {
    const setViewport = vi.fn();
    render({ mode: 'custom', width: 240, height: 480, orientation: 'portrait' }, setViewport);
    const right = container.querySelector('[aria-orientation="vertical"]') as HTMLDivElement;
    act(() => {
      right.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
    });
    expect(setViewport).toHaveBeenCalledWith(expect.objectContaining({ width: 240 }));
  });

  it('corner Arrow Down + Arrow Right nudge both', () => {
    const setViewport = vi.fn();
    render(CUSTOM, setViewport);
    const corner = container.querySelectorAll('[role="separator"]')[2] as HTMLDivElement;
    act(() => {
      corner.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      );
    });
    expect(setViewport).toHaveBeenLastCalledWith(expect.objectContaining({ height: 488 }));
    act(() => {
      corner.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });
    expect(setViewport).toHaveBeenLastCalledWith(expect.objectContaining({ width: 648 }));
  });
});

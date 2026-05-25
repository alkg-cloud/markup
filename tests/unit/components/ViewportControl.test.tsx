// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import { ViewportControl } from '@/components/CanvasToolbar/ViewportControl';
import {
  DEFAULT_VIEWPORT,
  VIEWPORT_PRESETS,
  type ViewportState,
} from '@/components/MockupViewer/viewport-presets';

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
    root.render(createElement(ViewportControl, { viewport, setViewport }));
  });
  return { setViewport };
}

describe('ViewportControl', () => {
  it('renders trigger with aria-label including active mode', () => {
    render(DEFAULT_VIEWPORT);
    const trigger = container.querySelector('button[aria-haspopup]');
    expect(trigger).toBeTruthy();
    expect(trigger!.getAttribute('aria-label')).toMatch(/Fit/i);
  });

  function openPopover() {
    const trigger = container.querySelector('button[aria-haspopup]') as HTMLButtonElement;
    act(() => {
      trigger.click();
    });
  }
  function findChip(label: RegExp): HTMLButtonElement | null {
    return Array.from(document.querySelectorAll('button[role="radio"]')).find((b) =>
      label.test(b.getAttribute('aria-label') ?? ''),
    ) as HTMLButtonElement | null;
  }

  it('clicking Desktop chip fires setViewport with desktop preset', () => {
    const setViewport = vi.fn();
    render(DEFAULT_VIEWPORT, setViewport);
    openPopover();
    const desktop = findChip(/Desktop/);
    expect(desktop).toBeTruthy();
    act(() => {
      desktop!.click();
    });
    expect(setViewport).toHaveBeenCalledWith({
      mode: 'desktop',
      width: 1440,
      height: 900,
      orientation: 'portrait',
    });
  });

  it('clicking Fit chip clears width/height', () => {
    const setViewport = vi.fn();
    render({ mode: 'mobile', width: 390, height: 844, orientation: 'portrait' }, setViewport);
    openPopover();
    const fit = findChip(/Fit/);
    expect(fit).toBeTruthy();
    act(() => {
      fit!.click();
    });
    expect(setViewport).toHaveBeenCalledWith({
      mode: 'fit',
      width: null,
      height: null,
      orientation: 'portrait',
    });
  });

  it('Tablet active renders the rotate button', () => {
    render({ mode: 'tablet', width: 768, height: 1024, orientation: 'portrait' });
    openPopover();
    const rotate = document.querySelector('button[aria-label="Rotate orientation"]');
    expect(rotate).toBeTruthy();
  });

  it('Fit active hides the rotate button', () => {
    render(DEFAULT_VIEWPORT);
    openPopover();
    const rotate = document.querySelector('button[aria-label="Rotate orientation"]');
    expect(rotate).toBeFalsy();
  });

  it('rotate swaps width and height for Tablet', () => {
    const setViewport = vi.fn();
    render({ mode: 'tablet', width: 768, height: 1024, orientation: 'portrait' }, setViewport);
    openPopover();
    const rotate = document.querySelector(
      'button[aria-label="Rotate orientation"]',
    ) as HTMLButtonElement;
    act(() => {
      rotate.click();
    });
    expect(setViewport).toHaveBeenCalledWith({
      mode: 'tablet',
      width: 1024,
      height: 768,
      orientation: 'landscape',
    });
  });

  it('Custom mode renders W and H inputs', () => {
    render({ mode: 'custom', width: 640, height: 480, orientation: 'portrait' });
    openPopover();
    expect(document.querySelector('#vp-w')).toBeTruthy();
    expect(document.querySelector('#vp-h')).toBeTruthy();
  });

  it('footer prefixes mode (locked footer-format=mode-and-size)', () => {
    render({ mode: 'desktop', width: 1440, height: 900, orientation: 'portrait' });
    openPopover();
    const popover = document.querySelector('[role="dialog"]') ?? document.body;
    expect(popover.textContent).toMatch(/Desktop ·/);
    expect(popover.textContent).toMatch(/1440 × 900/);
  });
});

// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ViewerShell pulls in hooks / components that reach into browser APIs
// not fully available in jsdom (ResizeObserver, iframe contentDocument,
// Fullscreen API). The smoke test only needs to verify DemoStage mounts
// a ViewerShell — stub the heavy dependencies so the React tree renders.
vi.mock('@/components/MockupViewer/useViewerCanvas', () => ({
  useViewerCanvas: () => ({
    iframeRef: { current: null },
    canvasRootRef: { current: null },
    iframeGen: 0,
  }),
}));
vi.mock('@/components/MockupViewer/ViewerCanvas', () => ({
  ViewerCanvas: () => null,
}));
vi.mock('@/components/MockupViewer/useViewerFullscreen', () => ({
  useViewerFullscreen: () => ({ isFullscreen: false, toggle: vi.fn() }),
}));
vi.mock('@/hooks/useDraftKeyboard', () => ({
  useDraftKeyboard: () => undefined,
}));
vi.mock('@/hooks/useDraftPersistence', () => ({
  useDraftPersistence: () => ({ flush: vi.fn(), clear: vi.fn() }),
}));
vi.mock('@/components/CanvasToolbar', () => ({
  CanvasToolbar: () => null,
}));

import { DemoStage } from '@/components/landing/InteractiveDemo/DemoStage';

describe('DemoStage', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('renders without throwing and mounts a ViewerShell', () => {
    const { container } = render(<DemoStage />);
    expect(container.querySelector('[data-viewer-shell]')).toBeTruthy();
  });

  it('renders the topbar with the reset button', () => {
    const { container } = render(<DemoStage />);
    // The reset button text lives in the demo topbar. React 19's
    // automatic batching can double-mount under jsdom, so we assert
    // presence via querySelector and tolerate either count.
    const resetButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      /Reset demo/i.test(b.textContent ?? ''),
    );
    expect(resetButtons.length).toBeGreaterThan(0);
  });
});

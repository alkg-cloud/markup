// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AppMainAnnotation, AppMainViewer } from '@/components/MockupViewer/AppMainViewer';
import type { VersionRow } from '@/components/VersionChip';

// Required for React 19 act() usage in vitest's jsdom environment.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// ── Module-level mocks for createRoot tests ──────────────────────────────
// AppMainViewer pulls in hooks / components that reach into browser APIs
// not fully available in jsdom (ResizeObserver, iframe contentDocument, etc.).
// We stub each problematic module so only the React tree + useEffect fire.

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

vi.mock('@/components/Toast/useToast', () => ({
  useToast: () => ({ show: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/components/CanvasToolbar', () => ({
  CanvasToolbar: () => null,
}));

// ── Shared fixtures ───────────────────────────────────────────────────────

const VERSIONS: VersionRow[] = [
  { id: 'v3', label: 'v3', current: true, createdBy: 'u1', createdByType: 'user' },
  { id: 'v2', label: 'v2', current: false, createdBy: 'u1', createdByType: 'user' },
];

const ANNOTATIONS: AppMainAnnotation[] = [];

// ── renderToStaticMarkup tests (SSR, no effects) ──────────────────────────

describe('AppMainViewer historic mode', () => {
  it('viewingVid === currentVid → no banner, "+ New annotation" present', () => {
    const html = renderToStaticMarkup(
      <AppMainViewer
        mockupId="m1"
        mockupSrc="/m/m1/index.html"
        currentUser="A"
        versions={VERSIONS}
        currentVid="v3"
        viewingVid="v3"
        initialAnnotations={ANNOTATIONS}
      />,
    );
    expect(html).not.toContain('Viewing');
    expect(html).toContain('New annotation');
  });

  it('viewingVid !== currentVid → banner present, "+ New annotation" hidden', () => {
    const html = renderToStaticMarkup(
      <AppMainViewer
        mockupId="m1"
        mockupSrc="/m/m1/index.html"
        currentUser="A"
        versions={VERSIONS}
        currentVid="v3"
        viewingVid="v2"
        initialAnnotations={ANNOTATIONS}
      />,
    );
    expect(html).toContain('Viewing v2');
    expect(html).toContain('Back to v3 (current)');
    expect(html).not.toContain('aria-label="New annotation');
  });

  it('viewingVid !== currentVid → banner present (iframe src tested separately via ViewerCanvas props)', () => {
    // ViewerCanvas is mocked to null in this file so the iframe element is
    // not rendered; we verify the historic UI signals instead.
    const html = renderToStaticMarkup(
      <AppMainViewer
        mockupId="m1"
        mockupSrc="/m/m1/index.html"
        currentUser="A"
        versions={VERSIONS}
        currentVid="v3"
        viewingVid="v2"
        initialAnnotations={ANNOTATIONS}
      />,
    );
    expect(html).toContain('Viewing v2');
    expect(html).not.toContain('aria-label="New annotation');
  });

  it('viewingVid unknown vid → treated as non-historic (no banner, no New annotation blocked)', () => {
    const html = renderToStaticMarkup(
      <AppMainViewer
        mockupId="m1"
        mockupSrc="/m/m1/index.html"
        currentUser="A"
        versions={VERSIONS}
        currentVid="v3"
        viewingVid="vGHOST"
        initialAnnotations={ANNOTATIONS}
      />,
    );
    expect(html).not.toContain('Viewing');
    expect(html).not.toContain('?v=vGHOST');
  });
});

// ── createRoot + act tests (DOM, effects run) ─────────────────────────────

describe('AppMainViewer onInvalidViewingVid effect', () => {
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

  function renderViewer(props: Partial<React.ComponentProps<typeof AppMainViewer>> = {}) {
    act(() => {
      root.render(
        <AppMainViewer
          mockupId="m1"
          mockupSrc="/m/m1/index.html"
          currentUser="A"
          versions={VERSIONS}
          currentVid="v3"
          initialAnnotations={ANNOTATIONS}
          {...props}
        />,
      );
    });
  }

  it('fires onInvalidViewingVid exactly once for an unknown vid', () => {
    const onInvalidViewingVid = vi.fn();

    renderViewer({ viewingVid: 'vGHOST', onInvalidViewingVid });
    expect(onInvalidViewingVid).toHaveBeenCalledTimes(1);

    // Rerender with the SAME unknown vid — must not refire
    renderViewer({ viewingVid: 'vGHOST', onInvalidViewingVid });
    expect(onInvalidViewingVid).toHaveBeenCalledTimes(1);
  });

  it('refires onInvalidViewingVid when a DIFFERENT unknown vid is supplied', () => {
    const onInvalidViewingVid = vi.fn();

    // First render with unknown vid → fires once
    renderViewer({ viewingVid: 'vGHOST_A', onInvalidViewingVid });
    expect(onInvalidViewingVid).toHaveBeenCalledTimes(1);

    // Switch to a KNOWN vid → clears the ref (no new fire)
    renderViewer({ viewingVid: 'v2', onInvalidViewingVid });
    expect(onInvalidViewingVid).toHaveBeenCalledTimes(1);

    // Now switch to a NEW unknown vid → fires again
    renderViewer({ viewingVid: 'vGHOST_B', onInvalidViewingVid });
    expect(onInvalidViewingVid).toHaveBeenCalledTimes(2);
  });
});

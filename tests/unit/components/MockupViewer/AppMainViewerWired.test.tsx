// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppMainViewerWired,
  type AppMainViewerWiredProps,
} from '@/components/MockupViewer/AppMainViewerWired';
import type { VersionRow } from '@/components/VersionChip';

// Required for React 19 act() usage in vitest's jsdom environment.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// ── next/navigation mock ──────────────────────────────────────────────────
const replaceMock = vi.fn();
const pathnameMock = '/projects/proj/mockup-slug';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => pathnameMock,
}));

// ── Heavy component/hook mocks (same as AppMainViewer.test.tsx) ───────────
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
  // Render the toolbar's versionChip slot so the VersionChip <li> rows appear
  // in the DOM. ViewerShell threads `renderToolbarChip()` through this slot.
  CanvasToolbar: ({ versionChip }: { versionChip?: React.ReactNode }) => versionChip ?? null,
}));

// ── Shared fixtures ───────────────────────────────────────────────────────

const VERSIONS: VersionRow[] = [
  { id: 'v3', label: 'v3', current: true, createdBy: 'u1', createdByType: 'user' },
  { id: 'v2', label: 'v2', current: false, createdBy: 'u1', createdByType: 'user' },
];

const BASE_PROPS: AppMainViewerWiredProps = {
  mockupId: 'm1',
  mockupName: 'My Mockup',
  mockupSrc: '/m/m1/index.html',
  currentUser: 'user@example.com',
  currentUserColorIndex: 0,
  versions: VERSIONS,
  initialAnnotations: [],
  currentVid: 'v3',
  viewingVid: null,
};

// ── createRoot helpers ────────────────────────────────────────────────────

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  replaceMock.mockReset();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function renderWired(props: Partial<AppMainViewerWiredProps> = {}) {
  act(() => {
    root.render(<AppMainViewerWired {...BASE_PROPS} {...props} />);
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('AppMainViewerWired — version select routing', () => {
  it('selecting a non-current version triggers router.replace with ?v=<vid>', () => {
    renderWired({ viewingVid: null, currentVid: 'v3' });

    const rows = Array.from(container.querySelectorAll<HTMLElement>('li'));
    const v2Row = rows.find((li) => li.textContent?.includes('v2'));
    expect(v2Row).toBeTruthy();

    act(() => {
      v2Row!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(`${pathnameMock}?v=v2`, { scroll: false });
  });

  it('selecting the current version triggers router.replace(pathname) — no ?v', () => {
    renderWired({ viewingVid: null, currentVid: 'v3' });

    const rows = Array.from(container.querySelectorAll<HTMLElement>('li'));
    const v3Row = rows.find((li) => li.textContent?.includes('v3'));
    expect(v3Row).toBeTruthy();

    act(() => {
      v3Row!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(pathnameMock, { scroll: false });
  });
});

describe('AppMainViewerWired — historic banner exit', () => {
  it('clicking "Back to current version" button triggers router.replace(pathname)', () => {
    // Render in historic mode so the banner is present
    renderWired({ viewingVid: 'v2', currentVid: 'v3' });

    const backBtn = container.querySelector<HTMLElement>(
      'button[aria-label="Back to current version"]',
    );
    expect(backBtn).toBeTruthy();

    act(() => {
      backBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(pathnameMock, { scroll: false });
  });
});

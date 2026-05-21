// @vitest-environment jsdom

import { act, createElement, useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// Mock html2canvas BEFORE importing the hook — vitest hoists `vi.mock` calls
// to the top of the file, but ordering is still important conceptually.
// jsdom has no real canvas, and html2canvas is heavy + does its own DOM
// traversal we don't want to exercise here. The default export is a function
// that returns a fake canvas with `toDataURL`.
const html2canvasMock = vi.fn();
vi.mock('html2canvas', () => ({
  default: (...args: unknown[]) => html2canvasMock(...args),
}));

// Track URL.createObjectURL / revokeObjectURL invocations. jsdom doesn't
// implement them by default; we stub them on `URL` so the hook can call them.
const createdUrls: string[] = [];
const revokedUrls: string[] = [];

beforeEach(() => {
  createdUrls.length = 0;
  revokedUrls.length = 0;
  let counter = 0;
  // jsdom v29 ships these, but they throw or no-op. Override unconditionally
  // so we can assert on them.
  (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () => {
    const u = `blob:fake-${++counter}`;
    createdUrls.push(u);
    return u;
  };
  (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = (u) => {
    revokedUrls.push(u);
  };
  html2canvasMock.mockReset();
  html2canvasMock.mockResolvedValue({ toDataURL: () => 'data:image/png;base64,FAKE' });
});

import { type PreviewState, useFilePreview } from '@/components/NewMockupDialog/useFilePreview';

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
  // Ensure no leftover timers leak between tests.
  vi.useRealTimers();
});

/**
 * The project does not depend on `@testing-library/react`, so we use a
 * tiny test harness that calls the hook and writes its current value
 * into a ref. Tests then read `latest.current` after `act` flushes.
 */
function makeHarness() {
  const latest: { current: PreviewState | null } = { current: null };

  function Harness({ file }: { file: File | null }) {
    const state = useFilePreview(file);
    const stateRef = useRef(state);
    stateRef.current = state;
    // Mirror into the outer ref on every commit so tests can observe it.
    useEffect(() => {
      latest.current = state;
    });
    // Synchronously expose on first render too.
    latest.current = state;
    return null;
  }

  function render(file: File | null) {
    act(() => {
      root.render(createElement(Harness, { file }));
    });
  }

  return { latest, render };
}

function htmlFile(name = 'index.html', body = '<html><body>hi</body></html>'): File {
  return new File([body], name, { type: 'text/html' });
}

function zipFile(name = 'mockup.zip'): File {
  // Body content doesn't matter — the hook should short-circuit on type.
  return new File([new Uint8Array([0x50, 0x4b])], name, { type: 'application/zip' });
}

/**
 * After triggering an iframe load, two micro-tasks must run before
 * `setState('ready')` is observable: the load handler awaits
 * `html2canvas(...)` (one tick) then sets state (another). `act(async)`
 * with a microtask flush is enough.
 */
async function flushMicrotasks() {
  await act(async () => {
    // Yield to the microtask queue so awaited promises resolve.
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useFilePreview', () => {
  it('returns loading state when file is null', () => {
    const { latest, render } = makeHarness();
    render(null);
    expect(latest.current?.state).toBe('loading');
    expect(latest.current?.dataUrl).toBeNull();
  });

  it('initial state with an HTML file is loading', () => {
    const { latest, render } = makeHarness();
    render(htmlFile());
    expect(latest.current?.state).toBe('loading');
    expect(latest.current?.dataUrl).toBeNull();
  });

  it('short-circuits to fallback with reason "zip" for ZIP files', () => {
    const { latest, render } = makeHarness();
    render(zipFile());
    expect(latest.current?.state).toBe('fallback');
    if (latest.current?.state === 'fallback') {
      expect(latest.current.reason).toBe('zip');
    }
    // No iframe should have been created.
    expect(document.querySelector('iframe')).toBeNull();
    // No object URL created either.
    expect(createdUrls).toHaveLength(0);
  });

  it('also detects ZIP via extension when MIME is empty', () => {
    const { latest, render } = makeHarness();
    render(new File([new Uint8Array([0x50, 0x4b])], 'thing.ZIP', { type: '' }));
    expect(latest.current?.state).toBe('fallback');
    if (latest.current?.state === 'fallback') {
      expect(latest.current.reason).toBe('zip');
    }
  });

  it('mounts an offscreen sandboxed iframe for HTML files', () => {
    const { render } = makeHarness();
    render(htmlFile());
    const iframe = document.querySelector('iframe') as HTMLIFrameElement | null;
    expect(iframe).not.toBeNull();
    if (!iframe) return;
    expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(iframe.style.position).toBe('fixed');
    expect(iframe.style.left).toBe('-10000px');
    expect(iframe.style.width).toBe('1280px');
    expect(iframe.style.height).toBe('720px');
    expect(iframe.src).toContain('blob:fake-');
  });

  it('transitions to ready when iframe loads and html2canvas resolves', async () => {
    const { latest, render } = makeHarness();
    render(htmlFile());

    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).not.toBeNull();

    // Fire the load event the hook listens for.
    act(() => {
      iframe.dispatchEvent(new Event('load'));
    });
    // html2canvas resolves on the microtask queue.
    await flushMicrotasks();

    expect(html2canvasMock).toHaveBeenCalledTimes(1);
    expect(latest.current?.state).toBe('ready');
    if (latest.current?.state === 'ready') {
      expect(latest.current.dataUrl).toBe('data:image/png;base64,FAKE');
    }
  });

  it('falls back with reason "error" when html2canvas rejects', async () => {
    html2canvasMock.mockRejectedValueOnce(new Error('CSP block'));
    const { latest, render } = makeHarness();
    render(htmlFile());

    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    act(() => {
      iframe.dispatchEvent(new Event('load'));
    });
    await flushMicrotasks();

    expect(latest.current?.state).toBe('fallback');
    if (latest.current?.state === 'fallback') {
      expect(latest.current.reason).toBe('error');
    }
  });

  it('falls back with reason "timeout" when 3000ms passes before load', async () => {
    vi.useFakeTimers();
    const { latest, render } = makeHarness();
    render(htmlFile());
    expect(latest.current?.state).toBe('loading');

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(latest.current?.state).toBe('fallback');
    if (latest.current?.state === 'fallback') {
      expect(latest.current.reason).toBe('timeout');
    }
    // html2canvas should NOT have been called — the load never fired.
    expect(html2canvasMock).not.toHaveBeenCalled();
  });

  it('cleans up the iframe and revokes the object URL on unmount', () => {
    const { render } = makeHarness();
    render(htmlFile());
    expect(document.querySelector('iframe')).not.toBeNull();
    expect(createdUrls).toHaveLength(1);

    act(() => {
      root.unmount();
    });

    expect(document.querySelector('iframe')).toBeNull();
    expect(revokedUrls).toEqual(createdUrls);
  });

  it('cleans up the previous iframe when the file changes', () => {
    const { render } = makeHarness();
    const first = htmlFile('a.html');
    const second = htmlFile('b.html');
    render(first);
    const firstIframe = document.querySelector('iframe');
    expect(firstIframe).not.toBeNull();
    expect(createdUrls).toHaveLength(1);

    render(second);
    // Previous iframe removed, new one mounted.
    expect(firstIframe?.isConnected).toBe(false);
    const second_iframe = document.querySelector('iframe');
    expect(second_iframe).not.toBeNull();
    expect(second_iframe).not.toBe(firstIframe);
    expect(createdUrls).toHaveLength(2);
    // First URL revoked.
    expect(revokedUrls).toContain(createdUrls[0]);
  });
});

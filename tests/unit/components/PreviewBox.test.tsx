// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PreviewBox } from '@/components/NewMockupDialog/PreviewBox';

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

function makeFile(name: string, type = 'text/html'): File {
  return new File(['<html></html>'], name, { type });
}

function getPreviewBox(): HTMLElement {
  const box = container.querySelector('[data-state]') as HTMLElement | null;
  if (box === null) throw new Error('preview-box not found');
  return box;
}

describe('PreviewBox', () => {
  it('renders [data-state="loading"] with 5 skeleton rows when isLoading', () => {
    renderNode(<PreviewBox file={makeFile('pricing.html')} previewDataUrl={null} isLoading />);

    const box = getPreviewBox();
    expect(box.getAttribute('data-state')).toBe('loading');
    expect(box.getAttribute('aria-busy')).toBe('true');

    // 5 inner skeleton rows mimicking title + 3 body + cta.
    const rows = box.querySelectorAll('div[class*="row"]');
    expect(rows.length).toBe(5);

    // No <img> in loading state.
    expect(box.querySelector('img')).toBeNull();
  });

  it('renders [data-state="ready"] with <img src={previewDataUrl}> when ready', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    renderNode(
      <PreviewBox file={makeFile('pricing.html')} previewDataUrl={dataUrl} isLoading={false} />,
    );

    const box = getPreviewBox();
    expect(box.getAttribute('data-state')).toBe('ready');
    expect(box.hasAttribute('aria-busy')).toBe(false);

    const img = box.querySelector('img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(dataUrl);
    expect(img?.getAttribute('alt')).toBe('Mockup preview');
  });

  it('renders [data-state="fallback"] with "ZIP" icon when fallbackReason is set for a .zip file', () => {
    renderNode(
      <PreviewBox
        file={makeFile('archive.zip', 'application/zip')}
        previewDataUrl={null}
        isLoading={false}
        fallbackReason="zip"
      />,
    );

    const box = getPreviewBox();
    expect(box.getAttribute('data-state')).toBe('fallback');
    expect(box.textContent).toContain('ZIP');
    expect(box.textContent).toContain('Preview generated after upload');
  });

  it('renders [data-state="fallback"] with "HTML" icon when fallbackReason is timeout for an HTML file', () => {
    renderNode(
      <PreviewBox
        file={makeFile('slow.html')}
        previewDataUrl={null}
        isLoading={false}
        fallbackReason="timeout"
      />,
    );

    const box = getPreviewBox();
    expect(box.getAttribute('data-state')).toBe('fallback');
    expect(box.textContent).toContain('HTML');
    expect(box.textContent).not.toContain('ZIP');
  });

  it('does case-insensitive extension matching for fallback icon (.ZIP → ZIP)', () => {
    renderNode(
      <PreviewBox
        file={makeFile('ARCHIVE.ZIP', 'application/zip')}
        previewDataUrl={null}
        isLoading={false}
        fallbackReason="zip"
      />,
    );

    const box = getPreviewBox();
    expect(box.textContent).toContain('ZIP');
  });

  it('renders statusLabel suffix inline with "Preview"', () => {
    renderNode(
      <PreviewBox
        file={makeFile('pricing.html')}
        previewDataUrl={null}
        isLoading
        statusLabel="generating…"
      />,
    );

    // Label is "Preview — generating…"
    expect(container.textContent).toContain('Preview');
    expect(container.textContent).toContain('generating…');
    // The literal suffix mark separates the two.
    expect(container.textContent).toMatch(/Preview\s*—\s*generating…/);
  });

  it('omits status suffix when statusLabel is not provided', () => {
    renderNode(
      <PreviewBox
        file={makeFile('pricing.html')}
        previewDataUrl={null}
        isLoading={false}
        fallbackReason="zip"
      />,
    );

    // Status span class hook (any "status" class) must NOT be present.
    const statusEl = container.querySelector('span[class*="status"]');
    expect(statusEl).toBeNull();
    // And no em-dash separator should leak in.
    expect(container.textContent).not.toMatch(/Preview\s*—/);
  });

  it('sets aria-busy="true" only while loading', () => {
    renderNode(
      <PreviewBox
        file={makeFile('pricing.html')}
        previewDataUrl="data:image/png;base64,iVBORw0KGgo="
        isLoading={false}
      />,
    );
    const box = getPreviewBox();
    expect(box.hasAttribute('aria-busy')).toBe(false);
  });

  it('falls back gracefully when no previewDataUrl, not loading, and no fallbackReason', () => {
    // Defensive guard: shouldn't happen in practice (the hook always returns
    // one of the three states), but the component must still render
    // *something* rather than an empty box.
    renderNode(
      <PreviewBox file={makeFile('pricing.html')} previewDataUrl={null} isLoading={false} />,
    );

    const box = getPreviewBox();
    expect(box.getAttribute('data-state')).toBe('fallback');
    expect(box.textContent).toContain('HTML');
  });
});

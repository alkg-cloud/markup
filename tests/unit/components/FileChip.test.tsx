// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileChip } from '@/components/NewMockupDialog/FileChip';

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

function makeFile(name: string, type: string, size: number): File {
  // Build a file with a controlled byte length by stuffing the blob with
  // `size` bytes of filler.
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

function getTypeBadge(): HTMLElement {
  const badge = container.querySelector('[data-type]') as HTMLElement | null;
  if (badge === null) throw new Error('file-chip type badge not found');
  return badge;
}

describe('FileChip', () => {
  it('picks "html" type from .html extension', () => {
    const file = makeFile('pricing-v3.html', 'text/html', 12_400);
    renderNode(<FileChip file={file} />);

    const badge = getTypeBadge();
    expect(badge.getAttribute('data-type')).toBe('html');
    expect(badge.textContent).toBe('HTML');
  });

  it('picks "zip" type from .zip extension', () => {
    const file = makeFile('lumen-coffee-bundle.zip', 'application/zip', 2_800_000);
    renderNode(<FileChip file={file} />);

    const badge = getTypeBadge();
    expect(badge.getAttribute('data-type')).toBe('zip');
    expect(badge.textContent).toBe('ZIP');
  });

  it('matches extension case-insensitively (.HTML uppercase → html)', () => {
    const file = makeFile('UPPER.HTML', '', 1024);
    renderNode(<FileChip file={file} />);

    expect(getTypeBadge().getAttribute('data-type')).toBe('html');
  });

  it('matches extension case-insensitively (.ZIP uppercase → zip)', () => {
    const file = makeFile('ARCHIVE.ZIP', '', 1024);
    renderNode(<FileChip file={file} />);

    expect(getTypeBadge().getAttribute('data-type')).toBe('zip');
  });

  it('falls back to MIME type when extension is missing or unknown', () => {
    const htmlByMime = makeFile('no-extension', 'text/html', 100);
    renderNode(<FileChip file={htmlByMime} />);
    expect(getTypeBadge().getAttribute('data-type')).toBe('html');

    // Re-render with a zip MIME and no recognized extension.
    const zipByMime = makeFile('archive.bin', 'application/zip', 100);
    act(() => {
      root.render(<FileChip file={zipByMime} />);
    });
    expect(getTypeBadge().getAttribute('data-type')).toBe('zip');
  });

  it('renders the filename', () => {
    const file = makeFile('pricing-v3.html', 'text/html', 12_400);
    renderNode(<FileChip file={file} />);
    expect(container.textContent).toContain('pricing-v3.html');
  });

  it('formats size 12400 bytes as "12.1 KB" (1 decimal under 100 KB)', () => {
    // 12400 / 1024 = 12.109… → "12.1 KB"
    const file = makeFile('pricing-v3.html', 'text/html', 12_400);
    renderNode(<FileChip file={file} />);
    expect(container.textContent).toMatch(/12\.1 KB/);
  });

  it('formats size 2_800_000 bytes as "2.7 MB"', () => {
    // 2_800_000 / (1024*1024) = 2.670… → "2.7 MB"
    const file = makeFile('big.zip', 'application/zip', 2_800_000);
    renderNode(<FileChip file={file} />);
    expect(container.textContent).toMatch(/2\.7 MB/);
  });

  it('formats small size 500 bytes as "0.5 KB"', () => {
    // 500 / 1024 = 0.488… → "0.5 KB"
    const file = makeFile('tiny.html', 'text/html', 500);
    renderNode(<FileChip file={file} />);
    expect(container.textContent).toMatch(/0\.5 KB/);
  });

  it('renders the MIME type after the size separator', () => {
    const file = makeFile('pricing-v3.html', 'text/html', 12_400);
    renderNode(<FileChip file={file} />);
    expect(container.textContent).toMatch(/12\.1 KB · text\/html/);
  });

  it('shows the type badge "ZIP" alongside size + MIME for zip files', () => {
    const file = makeFile('lumen-coffee-bundle.zip', 'application/zip', 2_800_000);
    renderNode(<FileChip file={file} />);
    expect(container.textContent).toContain('ZIP');
    expect(container.textContent).toMatch(/2\.7 MB · application\/zip/);
  });
});

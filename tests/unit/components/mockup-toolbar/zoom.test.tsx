/** @vitest-environment jsdom */

import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { MockupToolbar } from '@/components/MockupToolbar/MockupToolbar';

function Wrapper() {
  const [zoom, setZoom] = useState(100);
  const noop = () => {};
  const onZoomChange = (delta: number | 'reset') => {
    if (delta === 'reset') setZoom(100);
    else setZoom((z) => Math.min(400, Math.max(25, z + delta)));
  };
  return createElement(MockupToolbar, {
    zoom,
    versionLabel: 'v1',
    mode: 'edit',
    onModeChange: noop,
    onZoomChange,
    onFullscreen: noop,
    onHistory: noop,
    onDiff: noop,
  });
}

describe('MockupViewer zoom clamping (via toolbar contract)', () => {
  it('clamps zoom between 25 and 400 via repeated clicks', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(Wrapper));
    });
    const zoomIn = container.querySelector('button[aria-label="Zoom in"]') as HTMLButtonElement;
    const zoomOut = container.querySelector('button[aria-label="Zoom out"]') as HTMLButtonElement;

    // Click zoom in 50 times — should cap at 400.
    for (let i = 0; i < 50; i++) act(() => zoomIn.click());
    expect(container.textContent).toContain('400%');

    // Click zoom out 50 times — should bottom at 25.
    for (let i = 0; i < 50; i++) act(() => zoomOut.click());
    expect(container.textContent).toContain('25%');

    act(() => root.unmount());
    container.remove();
  });
});

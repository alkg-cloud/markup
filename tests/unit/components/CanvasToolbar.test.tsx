// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CanvasToolbar } from '@/components/CanvasToolbar/CanvasToolbar';
import {
  nextZoomIndex,
  ZOOM_DEFAULT_INDEX,
  ZOOM_STEPS,
  zoomLabel,
} from '@/components/CanvasToolbar/zoom';
import { VersionChip } from '@/components/VersionChip/VersionChip';

// Minimal stub satisfying VersionRow.createdBy / createdByType.
const mkVer = (id: string, label: string, current?: boolean) => ({
  id,
  label,
  current,
  createdBy: 'u-test',
  createdByType: 'user' as const,
});

describe('zoom utilities', () => {
  it('default index is 100%', () => {
    expect(ZOOM_STEPS[ZOOM_DEFAULT_INDEX]).toBe(1);
    expect(zoomLabel(ZOOM_DEFAULT_INDEX)).toBe('100%');
  });

  it('nextZoomIndex clamps within bounds', () => {
    expect(nextZoomIndex(0, -1)).toBe(0);
    expect(nextZoomIndex(ZOOM_STEPS.length - 1, 1)).toBe(ZOOM_STEPS.length - 1);
    expect(nextZoomIndex(ZOOM_DEFAULT_INDEX, 1)).toBe(ZOOM_DEFAULT_INDEX + 1);
  });

  it('zoomLabel returns percent string', () => {
    expect(zoomLabel(0)).toBe('25%');
    expect(zoomLabel(ZOOM_STEPS.length - 1)).toBe('400%');
  });
});

describe('CanvasToolbar', () => {
  it('renders zoom group with default 100%', () => {
    const html = renderToStaticMarkup(<CanvasToolbar />);
    expect(html).toContain('>100%</button>');
  });

  it('renders the fullscreen button with the correct tooltip', () => {
    const html = renderToStaticMarkup(<CanvasToolbar />);
    expect(html).toContain('data-tooltip="Fullscreen (F)"');
  });

  it('shows Exit tooltip when isFullscreen=true', () => {
    const html = renderToStaticMarkup(<CanvasToolbar isFullscreen />);
    expect(html).toContain('data-tooltip="Exit fullscreen (F or Esc)"');
    expect(html).toContain('aria-pressed="true"');
  });

  it('renders the version chip slot when provided', () => {
    const html = renderToStaticMarkup(
      <CanvasToolbar versionChip={<VersionChip versions={[mkVer('v4', 'v4', true)]} />} />,
    );
    expect(html).toContain('v4');
  });
});

describe('VersionChip', () => {
  it('renders current version label in the chip', () => {
    const html = renderToStaticMarkup(
      <VersionChip versions={[mkVer('v4', 'v4 · current', true), mkVer('v3', 'v3')]} />,
    );
    expect(html).toContain('v4 · current');
  });

  it('attaches the Versions & history tooltip', () => {
    const html = renderToStaticMarkup(<VersionChip versions={[mkVer('v1', 'v1', true)]} />);
    expect(html).toContain('data-tooltip="Versions');
  });

  it('disables Promote for the current version', () => {
    const html = renderToStaticMarkup(
      <VersionChip versions={[mkVer('v4', 'v4', true), mkVer('v3', 'v3')]} />,
    );
    // The current row has the Already-current label
    expect(html).toContain('Already current');
  });
});

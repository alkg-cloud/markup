// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VersionChip, type VersionRow } from '@/components/VersionChip/VersionChip';

// Required for React 19 act() usage in vitest's jsdom environment.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const VERSIONS: VersionRow[] = [
  {
    id: 'v3',
    label: 'v3',
    sub: 'now',
    current: true,
    createdBy: 'u1',
    createdByType: 'user',
  },
  {
    id: 'v2',
    label: 'v2',
    sub: 'earlier',
    current: false,
    createdBy: 'u1',
    createdByType: 'user',
  },
];

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

/**
 * Returns all <li> elements rendered by the version list.
 * The <li> rows exist in the DOM regardless of whether the popover is open
 * (the native HTML popover API only controls visibility via the top-layer /
 * display:none — the DOM nodes are always present).
 */
function getVersionRows(): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('li'));
}

describe('VersionChip', () => {
  it('fires onSelect with the row id when a non-current row is clicked', () => {
    const onSelect = vi.fn();
    renderNode(<VersionChip versions={VERSIONS} onSelect={onSelect} />);

    // v2 is the non-current version — second <li> in the list
    const rows = getVersionRows();
    expect(rows.length).toBeGreaterThanOrEqual(2);

    const v2Row = rows.find((li) => li.textContent?.includes('v2'));
    expect(v2Row).toBeTruthy();

    act(() => {
      v2Row!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('v2');
  });

  it('fires onSelect with the current row id when the current row is clicked', () => {
    const onSelect = vi.fn();
    renderNode(<VersionChip versions={VERSIONS} onSelect={onSelect} />);

    // v3 is the current version — first <li> in the list
    const rows = getVersionRows();
    expect(rows.length).toBeGreaterThanOrEqual(1);

    const v3Row = rows.find((li) => li.textContent?.includes('v3'));
    expect(v3Row).toBeTruthy();

    act(() => {
      v3Row!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('v3');
  });
});

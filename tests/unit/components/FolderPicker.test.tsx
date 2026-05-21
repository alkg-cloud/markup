// @vitest-environment jsdom

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FolderPicker, type FolderPickerFolder } from '@/components/FolderPicker';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom doesn't implement PointerEvent / hasPointerCapture / scrollIntoView,
// which Radix's primitives rely on. Polyfill the minimum surface.
if (typeof window !== 'undefined') {
  if (!(window as unknown as { PointerEvent?: unknown }).PointerEvent) {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 0;
        this.pointerType = params.pointerType ?? 'mouse';
      }
    }
    (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => undefined;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => undefined;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined;
  }
}

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

const FOLDERS: FolderPickerFolder[] = [
  { id: 'hero', name: 'Hero', parentId: null },
  { id: 'hero-section', name: 'Section', parentId: 'hero' },
  { id: 'pricing', name: 'Pricing', parentId: null },
  { id: 'ritual', name: 'Ritual', parentId: null },
];

function clickTrigger() {
  const trigger = container.querySelector(
    '[data-folder-picker-trigger]',
  ) as HTMLButtonElement | null;
  if (!trigger) throw new Error('trigger not found');
  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  return trigger;
}

function getOpenPopover() {
  return document.querySelector('[data-folder-popover][data-state="open"]') as HTMLElement | null;
}

function findRow(label: string) {
  const rows = Array.from(document.querySelectorAll('[data-folder-row]')) as HTMLElement[];
  return rows.find((row) => row.textContent?.includes(label)) ?? null;
}

describe('FolderPicker', () => {
  it('trigger renders the current selected folder name', () => {
    renderNode(
      <FolderPicker projectId="p1" folders={FOLDERS} value="hero-section" onChange={() => {}} />,
    );
    const trigger = container.querySelector('[data-folder-picker-trigger]') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toContain('Section');
  });

  it('renders "Project root" when value is null', () => {
    renderNode(<FolderPicker projectId="p1" folders={FOLDERS} value={null} onChange={() => {}} />);
    const trigger = container.querySelector('[data-folder-picker-trigger]') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Project root');
  });

  it('honours triggerLabel prop override', () => {
    renderNode(
      <FolderPicker
        projectId="p1"
        folders={FOLDERS}
        value="hero"
        onChange={() => {}}
        triggerLabel="Hero / Section"
      />,
    );
    const trigger = container.querySelector('[data-folder-picker-trigger]') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Hero / Section');
  });

  it('clicking trigger opens the popover (data-state=open)', () => {
    renderNode(<FolderPicker projectId="p1" folders={FOLDERS} value={null} onChange={() => {}} />);
    const trigger = clickTrigger();
    expect(trigger.getAttribute('data-state')).toBe('open');
    const popover = getOpenPopover();
    expect(popover).not.toBeNull();
  });

  it('clicking a folder row fires onChange(folderId) and updates the trigger label', () => {
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState<string | null>(null);
      return (
        <FolderPicker
          projectId="p1"
          folders={FOLDERS}
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }
    renderNode(<Harness />);

    clickTrigger();
    const row = findRow('Pricing');
    expect(row).not.toBeNull();
    act(() => {
      row!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(onChange).toHaveBeenCalledWith('pricing');
    const trigger = container.querySelector('[data-folder-picker-trigger]') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Pricing');
  });

  it('clicking "Project root" fires onChange(null)', () => {
    const onChange = vi.fn();
    renderNode(<FolderPicker projectId="p1" folders={FOLDERS} value="hero" onChange={onChange} />);
    clickTrigger();
    const rootRow = findRow('Project root');
    expect(rootRow).not.toBeNull();
    act(() => {
      rootRow!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('Esc closes the popover', () => {
    renderNode(<FolderPicker projectId="p1" folders={FOLDERS} value={null} onChange={() => {}} />);
    clickTrigger();
    expect(getOpenPopover()).not.toBeNull();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    expect(getOpenPopover()).toBeNull();
  });

  it('renders a child folder nested under its parent', () => {
    renderNode(<FolderPicker projectId="p1" folders={FOLDERS} value={null} onChange={() => {}} />);
    clickTrigger();
    // The "Section" row (child of Hero) lives inside a .folder-children container
    const section = findRow('Section');
    expect(section).not.toBeNull();
    const childContainer = section!.closest('[data-folder-children]');
    expect(childContainer).not.toBeNull();
  });

  it('is disabled (no popover opens) when projectId is null', () => {
    renderNode(<FolderPicker projectId={null} folders={[]} value={null} onChange={() => {}} />);
    const trigger = container.querySelector('[data-folder-picker-trigger]') as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(trigger.textContent).toContain('Unsorted');

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(getOpenPopover()).toBeNull();
  });

  it('handles empty folders array — trigger reads "Project root", no popover content', () => {
    renderNode(<FolderPicker projectId="p1" folders={[]} value={null} onChange={() => {}} />);
    const trigger = container.querySelector('[data-folder-picker-trigger]') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Project root');
    clickTrigger();
    // popover still opens but contains only the "Project root" row (the always-present option)
    const popover = getOpenPopover();
    expect(popover).not.toBeNull();
    const rows = popover!.querySelectorAll('[data-folder-row]');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Project root');
  });
});

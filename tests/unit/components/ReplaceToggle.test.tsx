// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReplaceToggle } from '@/components/NewMockupDialog/ReplaceToggle';

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

function getRadioRows(): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[role="radio"]'));
}

describe('ReplaceToggle', () => {
  it('renders both options, with the current mockup name in the Replace label', () => {
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="add" onChange={() => {}} />,
    );

    const rows = getRadioRows();
    expect(rows.length).toBe(2);

    expect(rows[0].textContent).toContain('Add as new mockup in the same folder');
    expect(rows[1].textContent).toContain('Replace as new version of');
    expect(rows[1].textContent).toContain('"lumen-coffee-hero"');
  });

  it('marks the "Add" row active when value="add"', () => {
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="add" onChange={() => {}} />,
    );

    const rows = getRadioRows();
    expect(rows[0].getAttribute('aria-checked')).toBe('true');
    expect(rows[1].getAttribute('aria-checked')).toBe('false');
    expect(rows[0].getAttribute('data-active')).toBe('true');
    expect(rows[1].getAttribute('data-active')).toBe('false');
  });

  it('marks the "Replace" row active when value="replace"', () => {
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="replace" onChange={() => {}} />,
    );

    const rows = getRadioRows();
    expect(rows[0].getAttribute('aria-checked')).toBe('false');
    expect(rows[1].getAttribute('aria-checked')).toBe('true');
    expect(rows[0].getAttribute('data-active')).toBe('false');
    expect(rows[1].getAttribute('data-active')).toBe('true');
  });

  it('fires onChange("add") when the first row is clicked', () => {
    const onChange = vi.fn();
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="replace" onChange={onChange} />,
    );

    const rows = getRadioRows();
    act(() => {
      rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('add');
  });

  it('fires onChange("replace") when the second row is clicked', () => {
    const onChange = vi.fn();
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="add" onChange={onChange} />,
    );

    const rows = getRadioRows();
    act(() => {
      rows[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('replace');
  });

  it('keyboard activation: Enter on the focused Replace row fires onChange("replace")', () => {
    const onChange = vi.fn();
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="add" onChange={onChange} />,
    );

    const rows = getRadioRows();
    rows[1].focus();
    expect(document.activeElement).toBe(rows[1]);

    act(() => {
      rows[1].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );
    });

    expect(onChange).toHaveBeenCalledWith('replace');
  });

  it('keyboard activation: Space on the focused Add row fires onChange("add")', () => {
    const onChange = vi.fn();
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="replace" onChange={onChange} />,
    );

    const rows = getRadioRows();
    rows[0].focus();

    act(() => {
      rows[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
    });

    expect(onChange).toHaveBeenCalledWith('add');
  });

  it('rows are reachable via Tab (tabIndex is set)', () => {
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="add" onChange={() => {}} />,
    );

    const rows = getRadioRows();
    // Both rows must be focusable. Per ARIA radiogroup pattern, only the
    // checked one needs to be in the tab sequence, but the unchecked one
    // must at least be programmatically focusable (tabIndex >= -1).
    expect(rows[0].tabIndex).toBeGreaterThanOrEqual(0);
    expect(rows[1].tabIndex).toBeGreaterThanOrEqual(-1);
  });

  it('emits the name in an accent-styled span (className hook)', () => {
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="add" onChange={() => {}} />,
    );

    // The accent span wraps the quoted mockup name.
    const accentSpan = container.querySelector('span[class*="nameQuote"]') as HTMLElement | null;
    expect(accentSpan).not.toBeNull();
    expect(accentSpan?.textContent).toBe('"lumen-coffee-hero"');
  });
});

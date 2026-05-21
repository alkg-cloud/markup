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

/**
 * Both the implicit radio role on `<input type="radio">` and our visible
 * `<label>` wrappers participate in the radiogroup pattern. Tests target
 * the native inputs (queried by role) for assertions about checked-state
 * and keyboard behaviour, and the surrounding `<label>` rows when
 * exercising click semantics — clicks bubble through the label to the
 * input, which is what end-users actually do.
 */
function getRadioInputs(): HTMLInputElement[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
}

function getRadioRows(): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-active]'));
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

    const inputs = getRadioInputs();
    const rows = getRadioRows();
    expect(inputs[0].checked).toBe(true);
    expect(inputs[1].checked).toBe(false);
    expect(rows[0].getAttribute('data-active')).toBe('true');
    expect(rows[1].getAttribute('data-active')).toBe('false');
  });

  it('marks the "Replace" row active when value="replace"', () => {
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="replace" onChange={() => {}} />,
    );

    const inputs = getRadioInputs();
    const rows = getRadioRows();
    expect(inputs[0].checked).toBe(false);
    expect(inputs[1].checked).toBe(true);
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

  it('native radios are grouped by a shared name attribute', () => {
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="add" onChange={() => {}} />,
    );

    const inputs = getRadioInputs();
    expect(inputs[0].name).toBe('mockup-replace-mode');
    expect(inputs[1].name).toBe('mockup-replace-mode');
  });

  it('native radios are focusable so the browser drives Tab + arrow navigation', () => {
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="add" onChange={() => {}} />,
    );

    const inputs = getRadioInputs();
    inputs[0].focus();
    expect(document.activeElement).toBe(inputs[0]);
    inputs[1].focus();
    expect(document.activeElement).toBe(inputs[1]);
  });

  it('clicking the input directly fires onChange with the matching mode', () => {
    const onChange = vi.fn();
    renderNode(
      <ReplaceToggle currentMockupName="lumen-coffee-hero" value="add" onChange={onChange} />,
    );

    const inputs = getRadioInputs();
    act(() => {
      inputs[1].click();
    });

    expect(onChange).toHaveBeenCalledWith('replace');
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

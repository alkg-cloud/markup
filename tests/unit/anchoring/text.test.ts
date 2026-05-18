// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { findCharPositionInElement, getCharOffsetInElement } from '@/lib/anchoring/text';

describe('text offset helpers', () => {
  let h1: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = `<h1>Cup the<br><em>quiet</em> mornings.</h1>`;
    h1 = document.querySelector('h1')!;
  });

  it('counts chars across nested text nodes (across <br> and <em>)', () => {
    const em = h1.querySelector('em')!;
    const textInEm = em.firstChild!;
    expect(getCharOffsetInElement(h1, textInEm, 0)).toBe(7); // 'Cup the' = 7 chars
    expect(getCharOffsetInElement(h1, textInEm, 5)).toBe(12);
  });

  it('returns -1 when target node is not inside the element', () => {
    const otherText = document.createTextNode('hello');
    document.body.appendChild(otherText);
    expect(getCharOffsetInElement(h1, otherText, 0)).toBe(-1);
  });

  it('inverts via findCharPositionInElement at a node boundary', () => {
    // At the boundary between "Cup the" (len 7) and "quiet" the position
    // lands on the END of the previous node. Visually this is the same
    // caret position as start-of-next; we deliberately prefer the previous
    // node so Range.setStart/setEnd has a valid offset without falling off.
    const pos = findCharPositionInElement(h1, 7)!;
    expect(pos.node.nodeValue).toBe('Cup the');
    expect(pos.offset).toBe(7);
  });

  it('inverts mid-node', () => {
    const pos = findCharPositionInElement(h1, 9)!;
    expect(pos.node.nodeValue).toBe('quiet');
    expect(pos.offset).toBe(2);
  });

  it('clamps to last node end when offset exceeds total length', () => {
    const pos = findCharPositionInElement(h1, 9999)!;
    expect(pos.node.nodeValue).toBe(' mornings.');
    expect(pos.offset).toBe(10);
  });

  it('returns null when the element has no text nodes', () => {
    const empty = document.createElement('div');
    document.body.appendChild(empty);
    expect(findCharPositionInElement(empty, 0)).toBeNull();
  });

  it('finds the first character at offset 0', () => {
    const pos = findCharPositionInElement(h1, 0)!;
    expect(pos.node.nodeValue).toBe('Cup the');
    expect(pos.offset).toBe(0);
  });
});

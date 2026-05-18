// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAnchorFromClick } from '@/lib/anchoring/click';

interface CaretRangeDocOverride {
  caretRangeFromPoint: ((x: number, y: number) => Range | null) | undefined;
}
type CaretRangeDoc = Omit<Document, 'caretRangeFromPoint'> & CaretRangeDocOverride;

function setCaretRangeStub(stub: ((x: number, y: number) => Range | null) | undefined) {
  (document as CaretRangeDoc).caretRangeFromPoint = stub;
}

function stubRangeBCR(rect: DOMRect) {
  // jsdom doesn't expose Range.prototype.getBoundingClientRect, so define it.
  // Using non-enumerable so it doesn't bleed into other test files.
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
}

describe('buildAnchorFromClick', () => {
  let root: HTMLElement;
  let para: HTMLParagraphElement;
  let textNode: Text;

  beforeEach(() => {
    document.body.innerHTML = `<div id="root"><p>Cup the quiet</p></div>`;
    root = document.getElementById('root')!;
    para = root.querySelector('p')!;
    textNode = para.firstChild as Text;
  });

  afterEach(() => {
    setCaretRangeStub(undefined);
    Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
  });

  it('returns null when target is outside the canvas root', () => {
    const outsider = document.createElement('span');
    document.body.appendChild(outsider);
    const a = buildAnchorFromClick({
      canvasRoot: root,
      target: outsider,
      clientX: 0,
      clientY: 0,
    });
    expect(a).toBeNull();
  });

  it('returns text-anchor when click lands inside character rect', () => {
    // Stub caretRangeFromPoint to return offset 4 inside our text node
    const fakeRange = document.createRange();
    fakeRange.setStart(textNode, 4);
    fakeRange.setEnd(textNode, 4);
    setCaretRangeStub(() => fakeRange);
    stubRangeBCR(new DOMRect(50, 100, 10, 16));

    const a = buildAnchorFromClick({
      canvasRoot: root,
      target: para,
      clientX: 55,
      clientY: 108,
    });
    expect(a).toMatchObject({
      textOffset: 4,
      subX: 0.5,
      subY: 0.5,
    });
    // textOffset should equal 4 because the text node is the first descendant
    expect((a as { textOffset: number }).textOffset).toBe(4);
  });

  it('falls back to element-anchor when caret snaps outside char rect', () => {
    const fakeRange = document.createRange();
    fakeRange.setStart(textNode, 0);
    fakeRange.setEnd(textNode, 0);
    setCaretRangeStub(() => fakeRange);
    stubRangeBCR(new DOMRect(50, 100, 10, 16));
    vi.spyOn(para, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 90, 200, 40));

    const a = buildAnchorFromClick({
      canvasRoot: root,
      target: para,
      // Far from the char rect (50,100,10,16) — caret snapped, reject.
      clientX: 200,
      clientY: 95,
    });
    // (200 - 40) / 200 = 0.8; (95 - 90) / 40 = 0.125
    expect(a).toMatchObject({
      offsetX: 0.8,
      offsetY: 0.125,
    });
    expect((a as { textOffset?: number }).textOffset).toBeUndefined();
  });

  it('falls back to element-anchor when caretRangeFromPoint returns null', () => {
    setCaretRangeStub(() => null);
    vi.spyOn(para, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 50));
    const a = buildAnchorFromClick({
      canvasRoot: root,
      target: para,
      clientX: 25,
      clientY: 10,
    });
    expect(a).toMatchObject({ offsetX: 0.25, offsetY: 0.2 });
  });
});

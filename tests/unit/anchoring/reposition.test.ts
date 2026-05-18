// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Anchor,
  applyPinPosition,
  computePinTarget,
  isTextAnchor,
  PIN_HALF,
  PIN_TIP_OFFSET_Y,
} from '@/lib/anchoring/reposition';

describe('reposition', () => {
  let root: HTMLElement;
  let layerRect: DOMRect;

  beforeEach(() => {
    document.body.innerHTML = `<div id="root"><div class="hero"><h1>Cup the<em>quiet</em></h1></div></div>`;
    root = document.getElementById('root')!;
    // Pin layer rect at viewport origin
    layerRect = new DOMRect(0, 0, 1000, 800);
  });

  describe('isTextAnchor', () => {
    it('returns true for text anchors', () => {
      expect(isTextAnchor({ path: '', textOffset: 0 })).toBe(true);
    });
    it('returns false for element anchors', () => {
      expect(isTextAnchor({ path: '', offsetX: 0.5, offsetY: 0.5 } as Anchor)).toBe(false);
    });
  });

  describe('computePinTarget — element anchor', () => {
    it('returns null when the anchor element does not resolve', () => {
      const result = computePinTarget(root, layerRect, {
        path: ':scope>nope>nope',
        offsetX: 0.5,
        offsetY: 0.5,
      });
      expect(result).toBeNull();
    });

    it('computes (left + offsetX*width, top + offsetY*height) for element anchor', () => {
      const hero = root.querySelector('.hero')!;
      vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 400, 200));
      const result = computePinTarget(root, layerRect, {
        path: ':scope>div',
        offsetX: 0.25,
        offsetY: 0.5,
      });
      // tx = 100 - 0 + 0.25*400 = 200; ty = 50 - 0 + 0.5*200 = 150
      expect(result).toEqual({ tx: 200, ty: 150 });
    });

    it('subtracts layerRect offsets so pin is positioned relative to its layer', () => {
      const hero = root.querySelector('.hero')!;
      vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 400, 200));
      const layerWithOffset = new DOMRect(20, 10, 1000, 800);
      const result = computePinTarget(root, layerWithOffset, {
        path: ':scope>div',
        offsetX: 0,
        offsetY: 0,
      });
      expect(result).toEqual({ tx: 80, ty: 40 });
    });
  });

  describe('computePinTarget — text anchor', () => {
    it('returns null when textOffset cannot be resolved (no text)', () => {
      const empty = document.createElement('div');
      root.appendChild(empty);
      const result = computePinTarget(root, layerRect, {
        path: ':scope>div:nth-of-type(2)',
        textOffset: 0,
      });
      expect(result).toBeNull();
    });
  });

  describe('computePinTarget — cross-document (iframe canvas root)', () => {
    it('adds frameOrigin offsets to element-anchor rects', () => {
      const hero = root.querySelector('.hero')!;
      // Inner BCR — iframe-viewport relative (e.g. element at top of iframe)
      vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 20, 400, 200));
      const frameOrigin = { left: 100, top: 50 };
      const result = computePinTarget(
        root,
        new DOMRect(0, 0, 1000, 800),
        { path: ':scope>div', offsetX: 0.5, offsetY: 0.5 },
        frameOrigin,
      );
      // outerX = frame.left + inner.left + 0.5*inner.width = 100 + 10 + 200 = 310
      // outerY = frame.top  + inner.top  + 0.5*inner.height = 50 + 20 + 100 = 170
      // tx = outerX - layerRect.left = 310; ty = outerY - layerRect.top = 170
      expect(result).toEqual({ tx: 310, ty: 170 });
    });

    it('combines frameOrigin and layerRect offsets correctly', () => {
      const hero = root.querySelector('.hero')!;
      vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 20, 400, 200));
      const result = computePinTarget(
        root,
        new DOMRect(40, 30, 1000, 800),
        { path: ':scope>div', offsetX: 0, offsetY: 0 },
        { left: 100, top: 50 },
      );
      // outerX = 100 + 10 + 0 = 110; tx = 110 - 40 = 70
      // outerY = 50 + 20 + 0 = 70; ty = 70 - 30 = 40
      expect(result).toEqual({ tx: 70, ty: 40 });
    });

    it('omitted frameOrigin behaves like no offset (same-document)', () => {
      const hero = root.querySelector('.hero')!;
      vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 400, 200));
      const withoutOrigin = computePinTarget(root, layerRect, {
        path: ':scope>div',
        offsetX: 0.25,
        offsetY: 0.5,
      });
      const withZeroOrigin = computePinTarget(
        root,
        layerRect,
        { path: ':scope>div', offsetX: 0.25, offsetY: 0.5 },
        { left: 0, top: 0 },
      );
      expect(withZeroOrigin).toEqual(withoutOrigin);
    });

    it('applies frameOrigin.scale to iframe-local rects (canvas zoom)', () => {
      // Element at iframe-local (10, 20, 400, 200). Iframe outer position
      // (100, 50) with CSS scale 1.25 → element appears on screen at
      // x = 100 + (10 + 0.5*400) * 1.25 = 100 + 262.5 = 362.5
      // y = 50  + (20 + 0.5*200) * 1.25 = 50  + 150   = 200
      const hero = root.querySelector('.hero')!;
      vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 20, 400, 200));
      const result = computePinTarget(
        root,
        new DOMRect(0, 0, 1000, 800),
        { path: ':scope>div', offsetX: 0.5, offsetY: 0.5 },
        { left: 100, top: 50, scale: 1.25 },
      );
      expect(result).toEqual({ tx: 362.5, ty: 200 });
    });

    it('scale=0.5 halves iframe-local coordinates', () => {
      const hero = root.querySelector('.hero')!;
      vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 60, 200, 100));
      const result = computePinTarget(
        root,
        new DOMRect(0, 0, 1000, 800),
        { path: ':scope>div', offsetX: 0, offsetY: 0 },
        { left: 100, top: 50, scale: 0.5 },
      );
      // x = 100 + 40*0.5 = 120; y = 50 + 60*0.5 = 80
      expect(result).toEqual({ tx: 120, ty: 80 });
    });
  });

  describe('applyPinPosition', () => {
    it('writes top/left so the tip lands on (tx, ty)', () => {
      const pin = document.createElement('div');
      applyPinPosition(pin, { tx: 100, ty: 200 });
      // left = tx - PIN_HALF; top = ty - PIN_HALF - PIN_TIP_OFFSET_Y
      expect(pin.style.left).toBe(`${100 - PIN_HALF}px`);
      expect(pin.style.top).toBe(`${200 - PIN_HALF - PIN_TIP_OFFSET_Y}px`);
    });
  });

  describe('PIN constants', () => {
    it('PIN_HALF is 15', () => {
      expect(PIN_HALF).toBe(15);
    });
    it('PIN_TIP_OFFSET_Y is 21 (15*sqrt(2) rounded)', () => {
      expect(PIN_TIP_OFFSET_Y).toBe(21);
    });
  });
});

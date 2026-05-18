// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Anchor,
  PIN_HALF,
  PIN_TIP_OFFSET_Y,
  applyPinPosition,
  computePinTarget,
  isTextAnchor,
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
      const result = computePinTarget(
        root,
        layerRect,
        { path: ':scope>nope>nope', offsetX: 0.5, offsetY: 0.5 },
      );
      expect(result).toBeNull();
    });

    it('computes (left + offsetX*width, top + offsetY*height) for element anchor', () => {
      const hero = root.querySelector('.hero')!;
      vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(100, 50, 400, 200),
      );
      const result = computePinTarget(
        root,
        layerRect,
        { path: ':scope>div', offsetX: 0.25, offsetY: 0.5 },
      );
      // tx = 100 - 0 + 0.25*400 = 200; ty = 50 - 0 + 0.5*200 = 150
      expect(result).toEqual({ tx: 200, ty: 150 });
    });

    it('subtracts layerRect offsets so pin is positioned relative to its layer', () => {
      const hero = root.querySelector('.hero')!;
      vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(100, 50, 400, 200),
      );
      const layerWithOffset = new DOMRect(20, 10, 1000, 800);
      const result = computePinTarget(
        root,
        layerWithOffset,
        { path: ':scope>div', offsetX: 0, offsetY: 0 },
      );
      expect(result).toEqual({ tx: 80, ty: 40 });
    });
  });

  describe('computePinTarget — text anchor', () => {
    it('returns null when textOffset cannot be resolved (no text)', () => {
      const empty = document.createElement('div');
      root.appendChild(empty);
      const result = computePinTarget(
        root,
        layerRect,
        { path: ':scope>div:nth-of-type(2)', textOffset: 0 },
      );
      expect(result).toBeNull();
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

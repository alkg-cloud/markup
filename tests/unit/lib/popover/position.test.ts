// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { positionPopover } from '@/lib/popover/position';

type Rect = { top: number; left: number; width: number; height: number };

function makeAnchor(rect: Rect): HTMLElement {
  const el = document.createElement('button');
  el.getBoundingClientRect = () =>
    ({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.top + rect.height,
      right: rect.left + rect.width,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }) as DOMRect;
  return el;
}

function makePopover(rect: Rect): HTMLElement {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.getBoundingClientRect = () =>
    ({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.top + rect.height,
      right: rect.left + rect.width,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }) as DOMRect;
  return el;
}

describe('positionPopover', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });

  it('places below the trigger aligned to the left by default', () => {
    const trigger = makeAnchor({ top: 100, left: 200, width: 80, height: 32 });
    const popover = makePopover({ top: 0, left: 0, width: 200, height: 120 });
    positionPopover(popover, trigger);
    expect(popover.style.top).toBe('138px'); // 100 + 32 + 6 (default gap)
    expect(popover.style.left).toBe('200px');
  });

  it('aligns to the right when align="right"', () => {
    const trigger = makeAnchor({ top: 100, left: 200, width: 80, height: 32 });
    const popover = makePopover({ top: 0, left: 0, width: 200, height: 120 });
    positionPopover(popover, trigger, 'right');
    // popover.right == trigger.right (280) → left = 280 - 200 = 80
    expect(popover.style.left).toBe('80px');
  });

  it('aligns to the center when align="center"', () => {
    const trigger = makeAnchor({ top: 100, left: 400, width: 100, height: 32 });
    const popover = makePopover({ top: 0, left: 0, width: 200, height: 120 });
    positionPopover(popover, trigger, 'center');
    // center of trigger = 450; popover.left = 450 - 100 = 350
    expect(popover.style.left).toBe('350px');
  });

  it('flips above when no room below', () => {
    const trigger = makeAnchor({ top: 700, left: 200, width: 80, height: 50 });
    const popover = makePopover({ top: 0, left: 0, width: 200, height: 200 });
    positionPopover(popover, trigger);
    // below would be 756; window.innerHeight=800, 4 margin → 796 max
    // 756 + 200 = 956 > 796 → flip
    // flip top = 700 - 200 - 6 = 494
    expect(popover.style.top).toBe('494px');
  });

  it('clamps horizontally against the right edge', () => {
    const trigger = makeAnchor({ top: 100, left: 900, width: 80, height: 32 });
    const popover = makePopover({ top: 0, left: 0, width: 200, height: 120 });
    positionPopover(popover, trigger);
    // left = 900; maxLeft = 1000 - 200 - 4 = 796 → clamped to 796
    expect(popover.style.left).toBe('796px');
  });

  it('clamps horizontally against the left edge', () => {
    const trigger = makeAnchor({ top: 100, left: -50, width: 80, height: 32 });
    const popover = makePopover({ top: 0, left: 0, width: 200, height: 120 });
    positionPopover(popover, trigger);
    // left = -50 → margin 4
    expect(popover.style.left).toBe('4px');
  });

  it('clamps vertical top so popover never starts above the viewport', () => {
    // Flip happens, but the flipped position is still negative — must clamp to 4.
    Object.defineProperty(window, 'innerHeight', { value: 200, configurable: true });
    const trigger = makeAnchor({ top: 150, left: 200, width: 80, height: 40 });
    const popover = makePopover({ top: 0, left: 0, width: 200, height: 300 });
    positionPopover(popover, trigger);
    // below = 196; 196+300=496 > 196 (200-4) → flip
    // flip top = 150 - 300 - 6 = -156 → clamp to 4
    expect(popover.style.top).toBe('4px');
  });

  it('honors a custom gap value', () => {
    const trigger = makeAnchor({ top: 100, left: 200, width: 80, height: 32 });
    const popover = makePopover({ top: 0, left: 0, width: 200, height: 120 });
    positionPopover(popover, trigger, 'left', 20);
    // 100 + 32 + 20 = 152
    expect(popover.style.top).toBe('152px');
  });
});

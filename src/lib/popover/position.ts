export type PopoverAlign = 'left' | 'right' | 'center';

/**
 * Position a top-layer popover element relative to its anchor trigger.
 * Default placement is below the trigger; flips above if there's no
 * room. The horizontal anchor follows the alignment:
 *
 *   left    → popover.left   == trigger.left
 *   right   → popover.right  == trigger.right
 *   center  → popover.center == trigger.center
 *
 * Clamped to the viewport with a 4 px gutter. Writes `top` / `left`
 * inline on the popover so it works with `position: fixed`.
 */
export function positionPopover(
  popover: HTMLElement,
  trigger: HTMLElement,
  align: PopoverAlign = 'left',
  gap = 6,
): void {
  const triggerRect = trigger.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();

  let top = triggerRect.bottom + gap;
  let left: number;
  if (align === 'right') {
    left = triggerRect.right - popoverRect.width;
  } else if (align === 'center') {
    left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
  } else {
    left = triggerRect.left;
  }

  // Flip above the trigger if there's no room below.
  if (top + popoverRect.height > window.innerHeight - 4) {
    top = triggerRect.top - popoverRect.height - gap;
  }
  // Clamp to viewport horizontally.
  const margin = 4;
  const maxLeft = window.innerWidth - popoverRect.width - margin;
  left = Math.max(margin, Math.min(left, maxLeft));
  // Final vertical clamp so the popover never starts above the viewport.
  if (top < margin) top = margin;

  popover.style.top = `${Math.round(top)}px`;
  popover.style.left = `${Math.round(left)}px`;
}

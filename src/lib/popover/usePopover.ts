'use client';
import { type RefObject, useCallback, useEffect, useId, useRef } from 'react';
import { type PopoverAlign, positionPopover } from './position';

interface UsePopoverReturn<T extends HTMLElement, P extends HTMLElement> {
  /** Ref for the trigger element — anchor for positioning. */
  triggerRef: RefObject<T | null>;
  /** Ref for the popover element. */
  popoverRef: RefObject<P | null>;
  /** Spread on the trigger button — sets `popovertarget` so the browser
   *  toggles the popover natively (no JS state). */
  triggerProps: {
    popoverTarget: string;
    popoverTargetAction: 'toggle';
  };
  /** Spread on the popover element. `popover="auto"` paints in the
   *  top-layer with light-dismiss + ESC + single-active semantics. */
  popoverProps: {
    id: string;
    popover: 'auto';
    ref: RefObject<P | null>;
  };
  /** Imperatively close the popover (used by menu items so the action
   *  fires + the popover closes in the same gesture). */
  close: () => void;
}

/**
 * `usePopover` — the project's canonical popover hook. Wraps the
 * native HTML popover API (`popover="auto"` + `popovertarget`) plus a
 * position calculator that anchors the popover to the trigger. The
 * popover renders in the browser's top-layer, escaping every overflow
 * ancestor and stacking context — same guarantee as `TooltipPortal`.
 *
 * Pattern:
 *   const { triggerRef, popoverRef, triggerProps, popoverProps, close }
 *     = usePopover<HTMLButtonElement, HTMLDivElement>('right');
 *   return (
 *     <>
 *       <button ref={triggerRef} {...triggerProps}>Open</button>
 *       <div {...popoverProps} className={styles.popover}>
 *         <button onClick={() => { close(); doAction(); }}>Action</button>
 *       </div>
 *     </>
 *   );
 *
 * The popover CSS should set `position: fixed; inset: auto; margin: 0`
 * so the JS-written `top` / `left` win over the browser default
 * `inset: 0; margin: auto` (which centres the popover).
 *
 * See `docs/code-style.md § Popovers` for the rule.
 */
export function usePopover<T extends HTMLElement = HTMLElement, P extends HTMLElement = HTMLElement>(
  align: PopoverAlign = 'left',
): UsePopoverReturn<T, P> {
  const id = useId();
  const triggerRef = useRef<T | null>(null);
  const popoverRef = useRef<P | null>(null);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;
    const onBeforeToggle = (e: Event) => {
      const ev = e as ToggleEvent;
      if (ev.newState === 'open' && triggerRef.current) {
        // Position after the browser flips the popover to display:block
        // (the `beforetoggle` event already runs while the popover is
        // open enough to measure, but the next frame guarantees layout).
        requestAnimationFrame(() => {
          if (triggerRef.current) positionPopover(popover, triggerRef.current, align);
        });
      }
    };
    popover.addEventListener('beforetoggle', onBeforeToggle);
    return () => popover.removeEventListener('beforetoggle', onBeforeToggle);
  }, [align]);

  const close = useCallback(() => {
    const popover = popoverRef.current;
    if (popover && typeof popover.hidePopover === 'function' && popover.matches(':popover-open')) {
      popover.hidePopover();
    }
  }, []);

  return {
    triggerRef,
    popoverRef,
    triggerProps: { popoverTarget: id, popoverTargetAction: 'toggle' },
    popoverProps: { id, popover: 'auto', ref: popoverRef },
    close,
  };
}

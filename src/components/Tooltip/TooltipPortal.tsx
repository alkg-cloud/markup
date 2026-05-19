'use client';
import { useEffect, useRef } from 'react';

const TOOLTIP_ID = 'markup-tooltip';
const SHOW_DELAY_MS = 150;

/**
 * TooltipPortal — single global `<div popover="hint">` rendered once at
 * the root of the app. Listens for `mouseenter`/`focusin` (capture
 * phase) on every `[data-tooltip]` trigger, copies the trigger's
 * `data-tooltip` text into the popover, positions it via
 * `getBoundingClientRect`, and shows via the native popover API.
 *
 * `popover="hint"` paints the element in the browser's top-layer —
 * `position: fixed` against the viewport, escapes every overflow
 * ancestor, escapes every stacking context. No clipping, no z-index
 * fight, no per-trigger setup beyond the `data-tooltip` attribute. The
 * browser also handles light-dismiss so we don't need a global click
 * listener.
 *
 * The single-popover pattern keeps the API identical to the previous
 * CSS pseudo-element implementation — `data-tooltip="text"` plus an
 * optional `data-tooltip-align="left|center|right"` — so no trigger in
 * the app had to change. See `docs/code-style.md § Tooltips`.
 */
export function TooltipPortal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tooltip = ref.current;
    if (!tooltip) return;

    let activeTrigger: Element | null = null;
    let showTimer: number | null = null;

    const cancelShow = () => {
      if (showTimer !== null) {
        window.clearTimeout(showTimer);
        showTimer = null;
      }
    };

    const place = (trigger: Element) => {
      const text = trigger.getAttribute('data-tooltip');
      if (!text) return;
      const align = trigger.getAttribute('data-tooltip-align') ?? 'left';
      tooltip.textContent = text;
      tooltip.dataset.align = align;
      // showPopover MUST happen before measurement — the element is
      // `display: none` (popover default) until shown, so getBoundingClientRect
      // returns zeroes otherwise.
      try {
        if (!tooltip.matches(':popover-open')) tooltip.showPopover();
      } catch {
        // showPopover throws if the element is already shown / not
        // connected — both fine.
      }
      const triggerRect = trigger.getBoundingClientRect();
      const ttRect = tooltip.getBoundingClientRect();

      let top = triggerRect.top - ttRect.height - 6;
      let left: number;
      if (align === 'right') {
        left = triggerRect.right - ttRect.width;
      } else if (align === 'center') {
        left = triggerRect.left + (triggerRect.width - ttRect.width) / 2;
      } else {
        left = triggerRect.left;
      }
      // If there's no room above the trigger, flip to below.
      if (top < 4) top = triggerRect.bottom + 6;
      // Clamp horizontally to the viewport with a 4px gutter.
      const maxLeft = window.innerWidth - ttRect.width - 4;
      left = Math.max(4, Math.min(left, maxLeft));

      tooltip.style.top = `${Math.round(top)}px`;
      tooltip.style.left = `${Math.round(left)}px`;
    };

    const hide = () => {
      cancelShow();
      activeTrigger = null;
      try {
        if (tooltip.matches(':popover-open')) tooltip.hidePopover();
      } catch {
        // hidePopover throws if not shown — fine.
      }
    };

    const scheduleShow = (trigger: Element) => {
      activeTrigger = trigger;
      cancelShow();
      showTimer = window.setTimeout(() => {
        if (activeTrigger === trigger && document.body.contains(trigger)) {
          place(trigger);
        }
      }, SHOW_DELAY_MS);
    };

    const handleEnter = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest('[data-tooltip]');
      if (!trigger) return;
      // Skip empty data-tooltip — useful for triggers that turn the
      // tooltip off conditionally.
      const text = trigger.getAttribute('data-tooltip');
      if (!text) return;
      scheduleShow(trigger);
    };

    const handleLeave = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest('[data-tooltip]');
      if (!trigger) return;
      if (activeTrigger === trigger) hide();
    };

    const handleScroll = () => {
      // Suppress on scroll so a tooltip doesn't lag behind its trigger.
      if (activeTrigger) hide();
    };

    // Capture phase: tooltip-triggers nested inside other listeners
    // still get our handler before stopPropagation downstream cancels it.
    document.addEventListener('mouseenter', handleEnter, true);
    document.addEventListener('mouseleave', handleLeave, true);
    document.addEventListener('focusin', handleEnter);
    document.addEventListener('focusout', handleLeave);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', hide);

    return () => {
      cancelShow();
      document.removeEventListener('mouseenter', handleEnter, true);
      document.removeEventListener('mouseleave', handleLeave, true);
      document.removeEventListener('focusin', handleEnter);
      document.removeEventListener('focusout', handleLeave);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', hide);
    };
  }, []);

  return (
    <div
      ref={ref}
      id={TOOLTIP_ID}
      role="tooltip"
      popover="hint"
      className="markup-tooltip"
    />
  );
}

'use client';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import './Tooltip.css';

export type TooltipAlign = 'left' | 'center' | 'right';

export interface TooltipProps {
  /** Text shown above the trigger. */
  label: string;
  /** Where the tooltip aligns relative to the trigger. Default: left. */
  align?: TooltipAlign;
  /** Single React element to wrap. Tooltip injects `data-tooltip` (and
   *  `data-tooltip-align` when non-default). */
  children: ReactNode;
}

/**
 * Tooltip — wraps a single child element and decorates it with the
 * data-tooltip attribute that the global stylesheet renders as a
 * glass-bg label above the element on hover/focus.
 *
 * This is the canonical replacement for native `title` attribute usage
 * across the app per the spec's tooltip rule (§12). The only place
 * `title` is acceptable is when surfacing the FULL text of a value that
 * has been truncated by overflow (text-overflow:ellipsis or similar) —
 * Tooltip is for everything else.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §12.
 */
export function Tooltip({ label, align = 'left', children }: TooltipProps) {
  if (!isValidElement(children)) {
    // Fall through to a span wrapper so the data attribute still
    // attaches. Callers should pass an element though.
    return (
      <span data-tooltip={label} data-tooltip-align={align}>
        {children}
      </span>
    );
  }
  const child = children as ReactElement<Record<string, unknown>>;
  const extraProps: Record<string, unknown> = {
    'data-tooltip': label,
  };
  if (align !== 'left') extraProps['data-tooltip-align'] = align;
  return cloneElement(child, extraProps);
}

import 'server-only';

export const INTENT_KINDS = ['visual', 'copy', 'behavior', 'other'] as const;

export type IntentType = (typeof INTENT_KINDS)[number];

export function isIntentType(value: unknown): value is IntentType {
  return typeof value === 'string' && (INTENT_KINDS as readonly string[]).includes(value);
}

/**
 * Display-pill colours used on the annotation detail page next to the
 * timestamp. See docs/agent-loop/chips.md.
 */
export const INTENT_PILL_COLORS: Record<IntentType, { bg: string; fg: string }> = {
  visual: { bg: 'var(--accent-overlay-soft)', fg: 'var(--accent-bright)' },
  copy: { bg: 'var(--info-soft)', fg: 'var(--info)' },
  behavior: { bg: 'var(--warning-soft)', fg: 'var(--warning)' },
  other: { bg: 'var(--bg-elevated)', fg: 'var(--text-dim)' },
};

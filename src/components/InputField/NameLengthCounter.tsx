'use client';

/**
 * NameLengthCounter — advisory character counter for URL-safe name inputs.
 *
 * Renders "N / 64" only when `len >= NAME_LENGTH_WARN_THRESHOLD (56)` so
 * the counter doesn't add visual noise for short names.
 *
 * Color shifts:
 *   - 56–63 chars → --text-dim (advisory)
 *   - 64 chars (at cap) → --danger
 *
 * Meant to be used alongside an `<input maxLength={NAME_MAX_LENGTH}>` that
 * enforces the hard cap; this component is purely advisory.
 */

import { NAME_LENGTH_WARN_THRESHOLD, NAME_MAX_LENGTH } from '@/lib/validation/url-safe-name';

interface NameLengthCounterProps {
  len: number;
}

const counterStyle: React.CSSProperties = {
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  lineHeight: 1,
  userSelect: 'none',
};

export function NameLengthCounter({ len }: NameLengthCounterProps) {
  if (len < NAME_LENGTH_WARN_THRESHOLD) return null;
  const atCap = len >= NAME_MAX_LENGTH;
  return (
    <span
      style={{
        ...counterStyle,
        color: atCap ? 'var(--danger)' : 'var(--text-dim)',
      }}
      aria-live="polite"
    >
      {len} / {NAME_MAX_LENGTH}
    </span>
  );
}

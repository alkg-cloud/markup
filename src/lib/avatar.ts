/**
 * Avatar initials derivation.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §9.
 *
 * Algorithm:
 *   - "Alexandre Camillo" → "AC" (first letter of first + last word)
 *   - "Marina Sá"        → "MS"
 *   - "designer-bot"     → "DB" (when no space, falls back to slice(0,2))
 *   - ""                 → "?"
 */
export function initialsForName(name: string | null | undefined): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? '';
    const last = parts[parts.length - 1]?.[0] ?? '';
    return (first + last).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

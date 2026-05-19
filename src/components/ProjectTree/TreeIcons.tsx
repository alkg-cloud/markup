'use client';

import { resolveIconToken } from '@/components/IconPicker/icons';

/* ── Inline SVG icons for the project tree ────────────────────────────────
 *
 * Kept inline (rather than via `react-icons`) so the strokes match the
 * tree's typographic scale exactly and so the bundle doesn't pay for an
 * icon set's entry whenever the sidebar loads.
 */

export function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        d="M6 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProjectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6h12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function FolderIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2 5V4a1 1 0 011-1h3.5l1.5 1.5H13a1 1 0 011 1V6H3.5L2 5z"
          fill="currentColor"
          opacity="0.3"
        />
        <path d="M1.5 6.5h13l-1.5 7H3l-1.5-7z" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 4a1 1 0 011-1h3.5l1.5 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function MockupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="5" y="5" width="4" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="5" y="8" width="6" height="1.5" rx="0.75" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="8" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="12" cy="8" r="1.2" />
    </svg>
  );
}

export function ProjectIconResolved({ token }: { token: string }) {
  const resolved = resolveIconToken(token);
  if (!resolved) return <ProjectIcon />;
  if (resolved.type === 'emoji') return <span aria-hidden="true">{resolved.content}</span>;
  return <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: resolved.content }} />;
}

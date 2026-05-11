'use client';

import Link from 'next/link';
import { useState } from 'react';

export interface BreadcrumbSegment {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  segments: BreadcrumbSegment[];
}

export function Breadcrumbs({ segments }: BreadcrumbsProps) {
  const [showAll, setShowAll] = useState(false);

  if (segments.length === 0) return null;

  const needsTruncation = segments.length > 3 && !showAll;
  const visible = needsTruncation
    ? [segments[0], { label: '…', href: '' }, segments[segments.length - 1]]
    : segments;

  return (
    <nav aria-label="Navegação estrutural">
      <ol
        style={{
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2xs)',
          margin: 0,
          padding: 0,
          flexWrap: 'wrap',
        }}
      >
        {visible.map((seg, i) => {
          const isLast = i === visible.length - 1;
          const isEllipsis = seg.label === '…';

          return (
            <li
              key={`${seg.href}-${i}`}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)' }}
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 'var(--type-xs)',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}
                >
                  /
                </span>
              )}
              {isEllipsis ? (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  aria-label="Expandir navegação completa"
                  style={{
                    fontSize: 'var(--type-sm)',
                    color: 'var(--text-dim)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: 'var(--radius-xs)',
                    transition: 'background var(--motion-fast) var(--ease-standard)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  …
                </button>
              ) : isLast ? (
                <span
                  aria-current="page"
                  style={{
                    fontSize: 'var(--type-sm)',
                    color: 'var(--text-bright)',
                    fontWeight: 'var(--weight-semibold)',
                    padding: '2px 4px',
                  }}
                >
                  {seg.label}
                </span>
              ) : (
                <CrumbLink href={seg.href} label={seg.label} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CrumbLink({ href, label }: { href: string; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: 'var(--type-sm)',
        color: hovered ? 'var(--text)' : 'var(--text-dim)',
        textDecoration: 'none',
        padding: '2px 4px',
        borderRadius: 'var(--radius-xs)',
        background: hovered ? 'var(--surface-hover)' : 'transparent',
        transition:
          'color var(--motion-fast) var(--ease-standard), background var(--motion-fast) var(--ease-standard)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Link>
  );
}

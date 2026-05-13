'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './Breadcrumbs.module.css';

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
    <nav className={styles.nav} aria-label="Navegação estrutural">
      <ol className={styles.list}>
        {visible.map((seg, i) => {
          const isLast = i === visible.length - 1;
          const isEllipsis = seg.label === '…';

          return (
            <li key={`${seg.href}-${i}`} className={styles.item}>
              {i > 0 && (
                <span aria-hidden="true" className={styles.separator}>
                  /
                </span>
              )}
              {isEllipsis ? (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  aria-label="Expandir navegação completa"
                  className={styles.ellipsisBtn}
                >
                  …
                </button>
              ) : isLast ? (
                <span aria-current="page" className={styles.current}>
                  {seg.label}
                </span>
              ) : (
                <Link href={seg.href} className={styles.link}>
                  {seg.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

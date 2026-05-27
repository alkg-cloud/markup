'use client';

import { type ReactNode, useState } from 'react';
import styles from './CodeCard.module.css';

type Props = { filename: string; children: ReactNode; copyText: string };

export function CodeCard({ filename, children, copyText }: Props) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked (private mode, no permissions) — fail silently
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.name}>{filename}</span>
        <button type="button" className={styles.copy} onClick={onCopy} aria-live="polite">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className={styles.pre}>{children}</pre>
    </div>
  );
}

// Syntax-tinting helpers — apply via className so the pre's :global selectors target them.
export function C({ children }: { children: ReactNode }) {
  return <span className="c">{children}</span>;
}
export function K({ children }: { children: ReactNode }) {
  return <span className="k">{children}</span>;
}
export function V({ children }: { children: ReactNode }) {
  return <span className="v">{children}</span>;
}
export function S({ children }: { children: ReactNode }) {
  return <span className="s">{children}</span>;
}

'use client';

import type { ReactNode } from 'react';
import styles from './DemoToolbar.module.css';
import type { ToolMode } from './types';

type Tool = { id: ToolMode; label: string; icon: ReactNode };

const TOOLS: Tool[] = [
  {
    id: 'select',
    label: 'Select (V)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M5 3 L19 12 L12 13 L9 21 Z" />
      </svg>
    ),
  },
  {
    id: 'pin',
    label: 'Drop pin (P)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      </svg>
    ),
  },
  {
    id: 'draw',
    label: 'Draw',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 17l6-6 4 4 8-8" />
      </svg>
    ),
  },
];

type Props = {
  tool: ToolMode;
  onChange: (t: ToolMode) => void;
};

export function DemoToolbar({ tool, onChange }: Props) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Demo tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-label={t.label}
          title={t.label}
          aria-pressed={tool === t.id}
          className={`${styles.btn} ${tool === t.id ? styles.active : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.icon}
        </button>
      ))}
      <span className={styles.hint}>
        Press <kbd>P</kbd> to pin · <kbd>V</kbd> to select · <kbd>R</kbd> to reset
      </span>
    </div>
  );
}

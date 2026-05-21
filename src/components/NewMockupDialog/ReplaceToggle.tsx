'use client';

/**
 * `ReplaceToggle` — DS 25 replace-toggle radio group for the New-mockup
 * dialog when invoked from a mockup view.
 *
 * Pure controlled component: parent owns the `value` ('add' | 'replace')
 * and handles `onChange`. Default in the parent is `'add'` (locked design
 * decision — adding is the safer + more common path).
 *
 * The two rows follow the ARIA radiogroup pattern:
 *   - Container has `role="radiogroup"`.
 *   - Each row has `role="radio"` + `aria-checked` + `tabIndex` + a
 *     keyboard handler that fires `onChange` on Space / Enter.
 *   - Only the active row sits in the natural tab sequence (`tabIndex=0`);
 *     the inactive one is programmatically focusable (`tabIndex=-1`) so
 *     screen-reader arrow-key navigation still reaches it.
 *
 * Visual structure (DS 25):
 *   .replace-toggle
 *     .replace-label  ("Send as")
 *     .opts
 *       .opt-row[.is-active]  (radio + label)
 *       .opt-row[.is-active]  (radio + label)
 *
 * The replace label quotes the current mockup name in `--accent` via the
 * `.nameQuote` span.
 */

import type { KeyboardEvent } from 'react';
import styles from './ReplaceToggle.module.css';

export type ReplaceMode = 'add' | 'replace';

export type ReplaceToggleProps = {
  currentMockupName: string;
  value: ReplaceMode;
  onChange: (mode: ReplaceMode) => void;
};

type Row = { mode: ReplaceMode; render: () => React.ReactNode };

export function ReplaceToggle({ currentMockupName, value, onChange }: ReplaceToggleProps) {
  const rows: Row[] = [
    {
      mode: 'add',
      render: () => <span className={styles.lbl}>Add as new mockup in the same folder</span>,
    },
    {
      mode: 'replace',
      render: () => (
        <span className={styles.lbl}>
          Replace as new version of{' '}
          <span className={styles.nameQuote}>{`"${currentMockupName}"`}</span>
        </span>
      ),
    },
  ];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, mode: ReplaceMode) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onChange(mode);
    }
  }

  return (
    <div className={styles.replaceToggle} role="radiogroup" aria-label="Send as">
      <span className={styles.replaceLabel}>Send as</span>
      <div className={styles.opts}>
        {rows.map((row) => {
          const isActive = value === row.mode;
          return (
            <div
              key={row.mode}
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              data-active={isActive}
              className={`${styles.optRow}${isActive ? ` ${styles.isActive}` : ''}`}
              onClick={() => onChange(row.mode)}
              onKeyDown={(event) => handleKeyDown(event, row.mode)}
            >
              <span className={styles.radio} aria-hidden="true" />
              {row.render()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

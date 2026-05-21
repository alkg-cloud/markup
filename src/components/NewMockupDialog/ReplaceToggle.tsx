'use client';

/**
 * `ReplaceToggle` — DS 25 replace-toggle radio group for the New-mockup
 * dialog when invoked from a mockup view.
 *
 * Pure controlled component: parent owns the `value` ('add' | 'replace')
 * and handles `onChange`. Default in the parent is `'add'` (locked design
 * decision — adding is the safer + more common path).
 *
 * The two rows use native `<input type="radio">` inputs wrapped in a
 * `<label>`, grouped by a shared `name`. This gives us free keyboard
 * support (arrow keys, Space, Tab) and screen-reader semantics without
 * an explicit handler. The native input is visually hidden but remains
 * focusable; the visible `.radio` swatch is purely presentational.
 *
 * Visual structure (DS 25):
 *   .replace-toggle
 *     .replace-label  ("Send as")
 *     .opts
 *       label.opt-row[.is-active]  (hidden radio + swatch + label)
 *       label.opt-row[.is-active]  (hidden radio + swatch + label)
 *
 * The replace label quotes the current mockup name in `--accent` via the
 * `.nameQuote` span.
 */

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

  return (
    <div className={styles.replaceToggle} role="radiogroup" aria-label="Send as">
      <span className={styles.replaceLabel}>Send as</span>
      <div className={styles.opts}>
        {rows.map((row) => {
          const isActive = value === row.mode;
          return (
            <label
              key={row.mode}
              data-active={isActive}
              className={[styles.optRow, isActive && styles.isActive].filter(Boolean).join(' ')}
            >
              <input
                type="radio"
                name="mockup-replace-mode"
                value={row.mode}
                checked={isActive}
                onChange={() => onChange(row.mode)}
                className={styles.hiddenRadio}
              />
              <span className={styles.radio} aria-hidden="true" />
              {row.render()}
            </label>
          );
        })}
      </div>
    </div>
  );
}

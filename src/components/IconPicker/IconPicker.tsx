'use client';

import { useState } from 'react';
import styles from './IconPicker.module.css';
import { ICON_TABS, type IconTab, PICKER_ICONS } from './icons';

interface IconPickerProps {
  value?: string;
  onSelect: (token: string) => void;
}

export function IconPicker({ value, onSelect }: IconPickerProps) {
  const [tab, setTab] = useState<IconTab>('code');
  const [search, setSearch] = useState('');

  const allInTab = PICKER_ICONS[tab];
  const filtered = search.trim()
    ? allInTab.filter((entry) => entry.token.toLowerCase().includes(search.toLowerCase()))
    : allInTab;

  const currentToken = value ?? '';

  return (
    <div className={styles.popover}>
      <div className={styles.search}>
        <span className={styles.searchIcon}>
          {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon inside aria-hidden span */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M23.03 21.97L15.162 14.102C16.31 12.717 17 10.939 17 9C17 4.582 13.418 1 9 1C4.582 1 1 4.582 1 9C1 13.418 4.582 17 9 17C10.939 17 12.717 16.31 14.102 15.162L21.97 23.03L23.031 21.969L23.03 21.97ZM2.5 9C2.5 5.416 5.416 2.5 9 2.5C12.584 2.5 15.5 5.416 15.5 9C15.5 12.584 12.584 15.5 9 15.5C5.416 15.5 2.5 12.584 2.5 9Z" />
          </svg>
        </span>
        <input
          className={styles.searchInput}
          placeholder="Search icons…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search icons"
        />
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: tablist pattern requires role="tab" on buttons */}
      <div className={styles.tabs} role="tablist">
        {ICON_TABS.map(({ key, label }) => (
          // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA tablist pattern
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`${styles.tab}${tab === key ? ` ${styles.tabActive}` : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {filtered.map((entry) => {
          const isSelected = entry.token === currentToken;
          const isEmoji = entry.token.startsWith('emoji:');
          return (
            <button
              key={entry.token}
              type="button"
              aria-label={entry.token}
              aria-pressed={isSelected}
              className={`${styles.cell}${isSelected ? ` ${styles.cellSelected}` : ''}`}
              onClick={() => onSelect(entry.token)}
            >
              {isEmoji ? (
                <span aria-hidden="true">{entry.label}</span>
              ) : (
                // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG data from icons.ts
                <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: entry.svg ?? '' }} />
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.footer}>
        {currentToken ? (
          <span className={styles.token}>{currentToken}</span>
        ) : (
          <span>No icon selected</span>
        )}
      </div>
    </div>
  );
}

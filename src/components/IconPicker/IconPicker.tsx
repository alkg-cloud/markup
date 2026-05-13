'use client';

import { useState } from 'react';
import styles from './IconPicker.module.css';
import { filterIcons, type IconEntry, PICKER_ICONS } from './icons';

const TABS = ['code', 'brands', 'ui', 'emoji'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  code: 'Code',
  brands: 'Brands',
  ui: 'UI',
  emoji: 'Emoji',
};

interface IconPickerProps {
  value?: string;
  onSelect: (token: string) => void;
}

export function IconPicker({ value, onSelect }: IconPickerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('code');
  const [search, setSearch] = useState('');

  const icons = filterIcons(activeTab, search);

  return (
    <div className={styles.popover}>
      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={activeTab === tab ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => {
              setActiveTab(tab);
              setSearch('');
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className={styles.searchRow}>
        <svg
          className={styles.searchIcon}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M23.03 21.97L15.16 14.1C16.31 12.72 17 10.94 17 9 17 4.58 13.42 1 9 1 4.58 1 1 4.58 1 9c0 4.42 3.58 8 8 8 1.94 0 3.72-.69 5.1-1.84l7.87 7.87 1.06-1.06zM2.5 9C2.5 5.42 5.42 2.5 9 2.5c3.58 0 6.5 2.92 6.5 6.5S12.58 15.5 9 15.5C5.42 15.5 2.5 12.58 2.5 9z" />
        </svg>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search icons…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search icons"
        />
      </div>

      <div className={styles.grid} role="listbox" aria-label="Icon grid">
        {icons.map((icon) => (
          <IconCell
            key={icon.token}
            icon={icon}
            selected={icon.token === value}
            onSelect={onSelect}
          />
        ))}
      </div>

      {value && (
        <div className={styles.footer}>
          <span className={styles.footerToken}>{value}</span>
        </div>
      )}
    </div>
  );
}

function IconCell({
  icon,
  selected,
  onSelect,
}: {
  icon: IconEntry;
  selected: boolean;
  onSelect: (token: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      title={icon.token}
      className={selected ? `${styles.cell} ${styles.cellSelected}` : styles.cell}
      onClick={() => onSelect(icon.token)}
    >
      {icon.label ? (
        <span className={styles.emoji}>{icon.label}</span>
      ) : (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: hardcoded SVG data from PICKER_ICONS
        <span dangerouslySetInnerHTML={{ __html: icon.svg ?? '' }} />
      )}
    </button>
  );
}

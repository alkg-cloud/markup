'use client';

import { useState } from 'react';
import { VscSearch } from 'react-icons/vsc';
import styles from './IconPicker.module.css';
import { filterIcons, type IconEntry } from './icons';

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
        <VscSearch className={styles.searchIcon} size={12} aria-hidden="true" />
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
      ) : icon.Icon ? (
        <icon.Icon size={14} aria-hidden="true" />
      ) : null}
    </button>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TreeProject } from '@/components/ProjectTree/ProjectTree';
import styles from './CommandPalette.module.css';
import { filterAndGroup } from './filter';
import { type FlatSearchItem, flattenProjectTree } from './flatten';

interface CommandPaletteProps {
  projects: TreeProject[];
}

const TYPE_ICONS: Record<FlatSearchItem['type'], string> = {
  project: '\u{1F4C1}',
  folder: '\u{1F4C2}',
  mockup: '\u{1F5BC}',
};

const SECTION_ORDER = ['projects', 'folders', 'mockups'] as const;

const SECTION_LABELS: Record<(typeof SECTION_ORDER)[number], string> = {
  projects: 'PROJECTS',
  folders: 'FOLDERS',
  mockups: 'MOCKUPS',
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightMatch(text: string, query: string): string {
  const escaped = escapeHtml(text);
  if (!query) return escaped;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return escaped;
  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + query.length));
  const after = escapeHtml(text.slice(idx + query.length));
  return `${before}<mark>${match}</mark>${after}`;
}

export function CommandPalette({ projects }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const router = useRouter();

  const flatItems = useMemo(() => flattenProjectTree(projects), [projects]);
  const grouped = useMemo(
    () => filterAndGroup(flatItems, debouncedQuery),
    [flatItems, debouncedQuery],
  );

  const allVisible = useMemo(() => {
    const list: FlatSearchItem[] = [];
    for (const section of SECTION_ORDER) {
      for (const item of grouped[section]) {
        list.push(item);
      }
    }
    return list;
  }, [grouped]);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery('');
    setDebouncedQuery('');
    setSelectedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
  }, []);

  const navigateTo = useCallback(
    (item: FlatSearchItem) => {
      closePalette();
      router.push(item.href);
    },
    [closePalette, router],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setSelectedIndex(0);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) closePalette();
        else openPalette();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, openPalette, closePalette]);

  const handlePanelKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePalette();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(allVisible.length, 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allVisible.length) % Math.max(allVisible.length, 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = allVisible[selectedIndex];
        if (item) navigateTo(item);
      }
    },
    [allVisible, selectedIndex, closePalette, navigateTo],
  );

  useEffect(() => {
    if (!resultsRef.current) return;
    const el = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: scrim close on click is standard UX */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: scrim backdrop — no semantic role needed */}
      <div className={`${styles.scrim} ${styles.scrimOpen}`} onClick={closePalette} />
      <div
        className={`${styles.panel} ${styles.panelOpen}`}
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        onKeyDown={handlePanelKeyDown}
      >
        <div className={styles.inputRow}>
          <svg
            className={styles.searchIcon}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M23.03 21.97L15.162 14.102C16.31 12.717 17 10.939 17 9C17 4.582 13.418 1 9 1C4.582 1 1 4.582 1 9C1 13.418 4.582 17 9 17C10.939 17 12.717 16.31 14.102 15.162L21.97 23.03L23.031 21.969L23.03 21.97ZM2.5 9C2.5 5.416 5.416 2.5 9 2.5C12.584 2.5 15.5 5.416 15.5 9C15.5 12.584 12.584 15.5 9 15.5C5.416 15.5 2.5 12.584 2.5 9Z" />
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Search mockups, projects, folders..."
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className={styles.escBadge} onClick={closePalette}>
            esc
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.results} ref={resultsRef}>
          {allVisible.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>{'\u{1F50D}'}</div>
              <div className={styles.emptyText}>No results found</div>
            </div>
          ) : (
            SECTION_ORDER.map((section) => {
              const sectionItems = grouped[section];
              if (sectionItems.length === 0) return null;
              return (
                <div key={section}>
                  <div className={styles.sectionLabel}>{SECTION_LABELS[section]}</div>
                  {sectionItems.map((item) => {
                    const idx = flatIndex++;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        data-index={idx}
                        className={`${styles.item} ${idx === selectedIndex ? styles.itemSelected : ''}`}
                        style={{ animationDelay: `${idx * 20}ms` }}
                        onClick={() => navigateTo(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <div className={styles.itemIcon}>{TYPE_ICONS[item.type]}</div>
                        <div className={styles.itemInfo}>
                          <div
                            className={styles.itemName}
                            dangerouslySetInnerHTML={{
                              __html: highlightMatch(item.name, debouncedQuery),
                            }}
                          />
                          {item.path && (
                            <div
                              className={styles.itemPath}
                              dangerouslySetInnerHTML={{
                                __html: highlightMatch(item.path, debouncedQuery),
                              }}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerHint}>
            <kbd>{'↑↓'}</kbd> navigate
          </span>
          <span className={styles.footerHint}>
            <kbd>{'↵'}</kbd> open
          </span>
          <span className={styles.footerHint}>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VscSearch } from 'react-icons/vsc';
import { Kbd } from '@/components/Kbd/Kbd';
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

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlightMatch(text: string, query: string): string {
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
    // Focus is wired via the `useEffect` below — running `focus()` here
    // (even inside `requestAnimationFrame`) raced React 19's render
    // commit and frequently missed because the `<input>` was still
    // unmounted when the RAF callback fired.
  }, []);

  // Focus the search input every time the palette transitions to open.
  // The effect runs after the commit, so `inputRef.current` is always
  // pointing at the freshly mounted `<input>`.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) closePalette();
        else document.dispatchEvent(new CustomEvent('open-command-palette'));
      }
    }
    const handleCustomOpen = () => {
      if (!open) openPalette();
    };

    // Track which same-origin iframe documents we've already wired so we
    // don't double-bind on rebinds (the mockup viewer iframe reloads
    // between version switches and its `contentDocument` is recreated
    // each time).
    const wiredDocs = new WeakSet<Document>();
    const wiredIframes = new WeakMap<HTMLIFrameElement, () => void>();

    function wireIframe(iframe: HTMLIFrameElement) {
      // Both the initial scan and the MutationObserver can land on the
      // same iframe — bail out if we've already attached its `load`
      // hook so we don't stack duplicate listeners.
      if (wiredIframes.has(iframe)) return;
      const attach = () => {
        let doc: Document | null = null;
        try {
          doc = iframe.contentDocument;
        } catch {
          // Cross-origin iframe — nothing we can do; the user's host
          // document already has the listener, and any cross-origin
          // content blocks Ctrl+K via its own contract.
          return;
        }
        if (!doc || wiredDocs.has(doc)) return;
        wiredDocs.add(doc);
        doc.addEventListener('keydown', handleKeyDown);
      };
      // Same-origin iframes reload between version switches; rewire each
      // load so the listener follows the new contentDocument.
      iframe.addEventListener('load', attach);
      // If the iframe was already loaded when this effect runs, wire now.
      attach();
      wiredIframes.set(iframe, () => iframe.removeEventListener('load', attach));
    }

    function scanForIframes(root: ParentNode) {
      const iframes = root.querySelectorAll<HTMLIFrameElement>('iframe');
      iframes.forEach(wireIframe);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('open-command-palette', handleCustomOpen);
    scanForIframes(document);
    // Watch for iframes added later (e.g. when navigating between
    // mockups without a full route change).
    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        rec.addedNodes.forEach((n) => {
          if (n instanceof HTMLIFrameElement) wireIframe(n);
          else if (n instanceof Element) scanForIframes(n);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('open-command-palette', handleCustomOpen);
      mo.disconnect();
      // Best-effort detach. WeakSets/Maps will GC the rest; we cannot
      // enumerate them, so we re-scan the live iframes one last time.
      document.querySelectorAll('iframe').forEach((iframe) => {
        const teardown = wiredIframes.get(iframe);
        if (teardown) teardown();
        try {
          iframe.contentDocument?.removeEventListener('keydown', handleKeyDown);
        } catch {
          // ignore cross-origin
        }
      });
    };
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
          <VscSearch className={styles.searchIcon} size={18} aria-hidden="true" />
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
          {/* Mobile-only close affordance — sits as a flex sibling after
           *  the input so it never overlaps the typed text. CSS hides it
           *  on desktop (escBadge replaces it there). */}
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Close search"
            onClick={() => setOpen(false)}
          >
            ✕
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
            <Kbd.Group aria-label="up/down arrows">
              <Kbd.Key>↑↓</Kbd.Key>
            </Kbd.Group>{' '}
            navigate
          </span>
          <span className={styles.footerHint}>
            <Kbd keys={['enter']} /> open
          </span>
          <span className={styles.footerHint}>
            <Kbd keys={['esc']} /> close
          </span>
        </div>
      </div>
    </>
  );
}

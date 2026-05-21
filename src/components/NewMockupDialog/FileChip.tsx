'use client';

/**
 * `FileChip` — DS 25 file-chip surface for the New-mockup dialog.
 *
 * Pure presentational component. Receives a `File` and renders a color-coded
 * type badge ("HTML" — orange hue 60 — or "ZIP" — blue hue 240), the
 * filename, and a `{prettySize} · {mimeType}` meta line.
 *
 * Type-classification priority:
 *   1. Filename extension (case-insensitive `.html` or `.zip`)
 *   2. MIME type (`text/html` or `application/zip`)
 *   3. Default → `'html'` (the New-mockup dialog only opens for accepted
 *      file types, so this branch is defensive only)
 *
 * Size formatting (locked convention for this dialog — see plan §Task 10):
 *   - < 1 MB  → kilobytes with 1 decimal (e.g. "12.1 KB", "0.5 KB")
 *   - ≥ 1 MB  → megabytes with 1 decimal (e.g. "2.7 MB")
 *   This matches DS 25's mockup ("12.4 KB · text/html", "2.8 MB · application/zip");
 *   the small numeric drift vs the mockup (12.4 vs 12.1 etc.) is because the
 *   mockup pre-rounds against 1000-byte KB while we divide by 1024 — the
 *   computer-science convention used everywhere else in this codebase.
 */

import styles from './FileChip.module.css';

export type FileChipProps = {
  file: File;
};

type FileKind = 'html' | 'zip';

function detectKind(file: File): FileKind {
  const name = file.name.toLowerCase();
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'html';
  if (name.endsWith('.zip')) return 'zip';

  const mime = file.type.toLowerCase();
  if (mime === 'application/zip') return 'zip';
  if (mime === 'text/html') return 'html';

  // Defensive default — upstream validation only admits html/zip.
  return 'html';
}

function prettySize(bytes: number): string {
  const KB = 1024;
  const MB = KB * 1024;
  if (bytes >= MB) {
    return `${(bytes / MB).toFixed(1)} MB`;
  }
  return `${(bytes / KB).toFixed(1)} KB`;
}

function badgeLabel(kind: FileKind): 'HTML' | 'ZIP' {
  return kind === 'zip' ? 'ZIP' : 'HTML';
}

function mimeLabel(file: File, kind: FileKind): string {
  // Prefer the actual MIME the browser supplied; fall back to the canonical
  // MIME for the detected kind so we never render a bare " · " separator.
  if (file.type) return file.type;
  return kind === 'zip' ? 'application/zip' : 'text/html';
}

export function FileChip({ file }: FileChipProps) {
  const kind = detectKind(file);

  return (
    <div className={styles.fileChip}>
      <div className={styles.ftype} data-type={kind}>
        {badgeLabel(kind)}
      </div>
      <div className={styles.fmeta}>
        <div className={styles.fname}>{file.name}</div>
        <div className={styles.fsize}>
          {prettySize(file.size)} · {mimeLabel(file, kind)}
        </div>
      </div>
    </div>
  );
}

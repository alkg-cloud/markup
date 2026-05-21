'use client';

/**
 * `DropOverlay` — DS 24 implementation.
 *
 * Subscribes to {@link useDragTarget} and renders the scrim-leve + subtle
 * feedback overlay while `isOver === true`. Returns `null` otherwise.
 *
 * Mounted via `@radix-ui/react-portal` so the overlay escapes any
 * `overflow:hidden` ancestor and sits above the rest of the app shell
 * (z-index 90 in the module CSS).
 *
 * ARIA: `role="status"` + `aria-live="polite"` — announces the current
 * drop target without stealing focus from whatever the user was doing
 * before they started dragging.
 *
 * The path-preview pill mirrors DS 24's anatomy:
 *
 *   `[icon] [project-name] › [folder-1] › [folder-2] …`
 *
 * `target.projectLabel` may be `"Unsorted"` on routes without a project
 * (e.g. `/`); the icon falls back to an em-dash in that case to match the
 * "no project context yet" mockup.
 */

import { Portal } from '@radix-ui/react-portal';
import type { JSX } from 'react';

import { useDragTarget } from '@/hooks/useDragTarget';

import styles from './DropOverlay.module.css';

const UNSORTED_LABEL = 'Unsorted';

export function DropOverlay(): JSX.Element | null {
  const state = useDragTarget();
  if (!state.isOver) return null;

  const { projectLabel, folderPath } = state.target;
  const projectIcon = projectLabel === UNSORTED_LABEL ? '—' : '☕';

  return (
    <Portal>
      <div className={styles.overlay} role="status" aria-live="polite" data-drop-overlay="">
        <div className={styles.panel}>
          <div className={styles.iconCircle} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className={styles.title}>Drop your HTML here</h3>
          <div className={styles.pathPreview}>
            <span className={styles.projIcon} aria-hidden="true">
              {projectIcon}
            </span>
            <span className={styles.fullPath}>
              <span className={styles.segProj} data-seg="proj">
                {projectLabel}
              </span>
              {folderPath.map((segment, idx) => (
                // Folder labels can repeat across siblings ("Section" inside
                // "Hero" and "About"), so we include the index in the key.
                <span key={`${segment}-${idx}`} className={styles.fullPath}>
                  <span className={styles.sep} data-seg="sep" aria-hidden="true">
                    ›
                  </span>
                  <span className={styles.segFolder} data-seg="folder">
                    {segment}
                  </span>
                </span>
              ))}
            </span>
          </div>
          <div className={styles.disclaimer}>
            You can change the project and folder before submitting.
          </div>
        </div>
      </div>
    </Portal>
  );
}

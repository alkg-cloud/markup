'use client';

import * as Popover from '@radix-ui/react-popover';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type Orientation,
  VIEWPORT_MIN_HEIGHT,
  VIEWPORT_MIN_WIDTH,
  VIEWPORT_PRESETS,
  type ViewportMode,
  type ViewportPreset,
  type ViewportState,
} from '@/components/MockupViewer/viewport-presets';
import styles from './ViewportControl.module.css';

export interface ViewportControlProps {
  viewport: ViewportState;
  setViewport: (next: ViewportState) => void;
}

const INPUT_DEBOUNCE_MS = 100;

function presetLabel(mode: ViewportMode, viewport: ViewportState): string {
  switch (mode) {
    case 'fit':
      return 'Fit canvas';
    case 'desktop':
      return `Desktop ${VIEWPORT_PRESETS.desktop.width} × ${VIEWPORT_PRESETS.desktop.height}`;
    case 'tablet':
      return `Tablet ${VIEWPORT_PRESETS.tablet.width} × ${VIEWPORT_PRESETS.tablet.height}`;
    case 'mobile':
      return `Mobile ${VIEWPORT_PRESETS.mobile.width} × ${VIEWPORT_PRESETS.mobile.height}`;
    case 'custom':
      return `Custom ${viewport.width ?? '?'} × ${viewport.height ?? '?'}`;
  }
}

function modePrefix(mode: ViewportMode): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function applyOrientation(
  w: number,
  h: number,
  orientation: Orientation,
): { width: number; height: number } {
  return orientation === 'landscape' ? { width: h, height: w } : { width: w, height: h };
}

function presetState(preset: ViewportPreset, orientation: Orientation = 'portrait'): ViewportState {
  const base = VIEWPORT_PRESETS[preset];
  const { width, height } = applyOrientation(base.width, base.height, orientation);
  return { mode: preset, width, height, orientation };
}

export function ViewportControl({ viewport, setViewport }: ViewportControlProps) {
  const [open, setOpen] = useState(false);

  const triggerIcon = useMemo(() => {
    switch (viewport.mode) {
      case 'fit':
        return <FitIcon />;
      case 'desktop':
        return <DesktopIcon />;
      case 'tablet':
        return <TabletIcon />;
      case 'mobile':
        return <MobileIcon />;
      case 'custom':
        return <CustomIcon />;
    }
  }, [viewport.mode]);

  const handlePreset = useCallback(
    (preset: ViewportPreset) => () => setViewport(presetState(preset)),
    [setViewport],
  );
  const handleFit = useCallback(
    () => setViewport({ mode: 'fit', width: null, height: null, orientation: 'portrait' }),
    [setViewport],
  );
  const handleCustom = useCallback(() => {
    // Seed Custom W/H with the current dimensions or Desktop preset.
    const seedW = viewport.width ?? VIEWPORT_PRESETS.desktop.width;
    const seedH = viewport.height ?? VIEWPORT_PRESETS.desktop.height;
    setViewport({ mode: 'custom', width: seedW, height: seedH, orientation: 'portrait' });
  }, [viewport.width, viewport.height, setViewport]);
  const handleRotate = useCallback(() => {
    if (viewport.mode !== 'tablet' && viewport.mode !== 'mobile') return;
    const nextOrientation: Orientation =
      viewport.orientation === 'portrait' ? 'landscape' : 'portrait';
    setViewport(presetState(viewport.mode, nextOrientation));
  }, [viewport.mode, viewport.orientation, setViewport]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={styles.trigger}
          aria-label={`Viewport: ${presetLabel(viewport.mode, viewport)}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          data-state={open ? 'open' : undefined}
        >
          {triggerIcon}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="top" sideOffset={8} className={styles.popover}>
          <div role="radiogroup" aria-label="Viewport presets" className={styles.chips}>
            <ChipButton active={viewport.mode === 'fit'} label="Fit viewport" onClick={handleFit}>
              <FitIcon />
            </ChipButton>
            <ChipButton
              active={viewport.mode === 'desktop'}
              label={`Desktop ${VIEWPORT_PRESETS.desktop.width} × ${VIEWPORT_PRESETS.desktop.height}`}
              onClick={handlePreset('desktop')}
            >
              <DesktopIcon />
            </ChipButton>
            <ChipButton
              active={viewport.mode === 'tablet'}
              label={`Tablet ${VIEWPORT_PRESETS.tablet.width} × ${VIEWPORT_PRESETS.tablet.height}`}
              onClick={handlePreset('tablet')}
            >
              <TabletIcon />
            </ChipButton>
            <ChipButton
              active={viewport.mode === 'mobile'}
              label={`Mobile ${VIEWPORT_PRESETS.mobile.width} × ${VIEWPORT_PRESETS.mobile.height}`}
              onClick={handlePreset('mobile')}
            >
              <MobileIcon />
            </ChipButton>
            <ChipButton
              active={viewport.mode === 'custom'}
              label="Custom viewport"
              onClick={handleCustom}
            >
              <CustomIcon />
            </ChipButton>
            {(viewport.mode === 'tablet' || viewport.mode === 'mobile') && (
              <button
                type="button"
                className={styles.rotate}
                aria-label="Rotate orientation"
                onClick={handleRotate}
              >
                <RotateIcon />
              </button>
            )}
          </div>
          {viewport.mode === 'custom' && (
            <CustomInputs viewport={viewport} setViewport={setViewport} />
          )}
          <div className={styles.footer}>
            <span className={styles.footerMode}>{modePrefix(viewport.mode)} ·</span>
            <span>
              {viewport.mode === 'fit' ? 'Fit' : `${viewport.width} × ${viewport.height}`}
            </span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ChipButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: <input type="radio"> can't host the icon pattern; role=radio on <button> with aria-checked is intentional — matches AnnotationCard pattern in this codebase.
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      className={styles.chip}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function CustomInputs({
  viewport,
  setViewport,
}: {
  viewport: ViewportState;
  setViewport: (next: ViewportState) => void;
}) {
  const [draftW, setDraftW] = useState<string>(String(viewport.width ?? ''));
  const [draftH, setDraftH] = useState<string>(String(viewport.height ?? ''));

  useEffect(() => {
    setDraftW(String(viewport.width ?? ''));
    setDraftH(String(viewport.height ?? ''));
  }, [viewport.width, viewport.height]);

  useEffect(() => {
    const t = setTimeout(() => {
      // Empty string → Number("") === 0, which is finite. Reject explicitly
      // so a cleared field doesn't collapse the iframe to 0×0.
      if (draftW === '' || draftH === '') return;
      const w = Number(draftW);
      const h = Number(draftH);
      if (!Number.isFinite(w) || !Number.isFinite(h)) return;
      if (w < VIEWPORT_MIN_WIDTH || h < VIEWPORT_MIN_HEIGHT) return;
      if (w === viewport.width && h === viewport.height) return;
      setViewport({ ...viewport, mode: 'custom', width: Math.round(w), height: Math.round(h) });
    }, INPUT_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [draftW, draftH, viewport, setViewport]);

  return (
    <div className={styles.inputs}>
      <div className={styles.inputRow}>
        <label htmlFor="vp-w" className={styles.inputLabel}>
          W
        </label>
        <input
          id="vp-w"
          className={styles.input}
          type="number"
          inputMode="numeric"
          min={240}
          value={draftW}
          onChange={(e) => setDraftW(e.target.value)}
        />
      </div>
      <div className={styles.inputRow}>
        <label htmlFor="vp-h" className={styles.inputLabel}>
          H
        </label>
        <input
          id="vp-h"
          className={styles.input}
          type="number"
          inputMode="numeric"
          min={320}
          value={draftH}
          onChange={(e) => setDraftH(e.target.value)}
        />
      </div>
      <span className={styles.note}>Min 240 × 320. Excess scrolls.</span>
    </div>
  );
}

// ── Icons (inline SVG, matches DS file glyphs) ──

function FitIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3" />
    </svg>
  );
}
function DesktopIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1.5" y="2.5" width="13" height="9" rx="1.3" />
      <path d="M5.5 14h5M8 11.5V14" />
    </svg>
  );
}
function TabletIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="1.5" width="10" height="13" rx="1.3" />
      <path d="M7 12.7h2" />
    </svg>
  );
}
function MobileIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4.5" y="1.5" width="7" height="13" rx="1.2" />
      <path d="M7 13h2" />
    </svg>
  );
}
function CustomIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 4h6M3 8h10M3 12h4" />
      <circle cx="11" cy="4" r="1.2" />
      <circle cx="5" cy="12" r="1.2" />
    </svg>
  );
}
function RotateIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8a5 5 0 0 1 9-3M13 8a5 5 0 0 1-9 3" />
      <path d="M11.5 2.5v3h-3M4.5 13.5v-3h3" />
    </svg>
  );
}

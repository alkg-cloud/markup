'use client';

import styles from './DemoPinLayer.module.css';
import type { DemoAnnotation } from './types';

const HUES = [
  'var(--accent)',
  'oklch(74% 0.18 50)',
  'oklch(74% 0.18 280)',
  'oklch(74% 0.18 320)',
  'oklch(74% 0.18 152)',
] as const;

type Props = {
  annotations: DemoAnnotation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function DemoPinLayer({ annotations, selectedId, onSelect }: Props) {
  return (
    <>
      {annotations.flatMap((a, idx) =>
        a.pins.map((p) => {
          const hue = HUES[a.colorIndex % HUES.length];
          const isSelected = a.id === selectedId;
          return (
            <button
              key={p.id}
              type="button"
              aria-label={`Annotation ${idx + 1}`}
              className={`${styles.pin} ${isSelected ? styles.selected : ''}`}
              style={{ left: `${p.xPct}%`, top: `${p.yPct}%`, background: hue }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(a.id);
              }}
            >
              <span>{idx + 1}</span>
            </button>
          );
        }),
      )}
    </>
  );
}

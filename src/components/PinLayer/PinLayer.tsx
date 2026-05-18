'use client';
import { type RefObject, useCallback, useMemo, useRef } from 'react';
import { Pin } from '@/components/Pin/Pin';
import { type Anchor, useAnchoredPins } from '@/lib/anchoring';
import styles from './PinLayer.module.css';

export interface PinDescriptor {
  annotationId: string;
  colorIndex: number;
  label: number | string;
  /**
   * One pin can have multiple anchors (multi-pin per annotation). The
   * parent renders one entry per (annotationId, anchorIndex) pair.
   */
  anchor: Anchor;
  status?: 'idle' | 'active' | 'pending';
  tooltip?: string;
}

export interface PinLayerProps {
  /** The canvas root that anchor paths resolve against (mockup-doc). */
  canvasRootRef: RefObject<Element | null>;
  /** Pin descriptors keyed by `${annotationId}:${anchorIndex}`. */
  pins: PinDescriptor[];
  /** Fired when a non-pending pin is clicked. */
  onPinClick?: (annotationId: string) => void;
  /**
   * Token that forces a synchronous reposition when it changes. Consumers
   * bump this after layout-affecting state mutations (zoom, fullscreen,
   * iframe load) that the hook's ResizeObserver / scroll listeners don't
   * naturally observe.
   */
  repositionKey?: unknown;
}

/**
 * Pin layer — overlay container that wires every pin's position to the
 * anchoring runtime. Pins re-render whenever the canvas resizes,
 * fullscreen toggles, or the consumer triggers a manual reposition.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §6.
 */
export function PinLayer({ canvasRootRef, pins, onPinClick, repositionKey }: PinLayerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const pinElsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const getPins = useCallback(
    function* (): Generator<[HTMLElement, Anchor]> {
      for (const p of pins) {
        const key = `${p.annotationId}:${pinKey(p)}`;
        const el = pinElsRef.current.get(key);
        if (el) yield [el, p.anchor];
      }
    },
    [pins],
  );

  const { repositionAll } = useAnchoredPins({
    canvasRootRef,
    pinLayerRef: layerRef,
    getPins,
  });

  // Re-position synchronously whenever the pin list changes (new pin
  // added, pin removed, anchor edited) OR when the parent bumps
  // `repositionKey` to signal a layout change (zoom, fullscreen, iframe
  // load) that the hook's ResizeObserver / scroll listeners don't catch.
  useMemo(() => {
    repositionAll();
  }, [pins, repositionAll, repositionKey]);

  return (
    <div ref={layerRef} className={styles.pinLayer} aria-hidden="false">
      {pins.map((p) => {
        const key = `${p.annotationId}:${pinKey(p)}`;
        return (
          <Pin
            key={key}
            ref={(el: HTMLButtonElement | null) => {
              if (el) pinElsRef.current.set(key, el);
              else pinElsRef.current.delete(key);
            }}
            annotationId={p.annotationId}
            colorIndex={p.colorIndex}
            label={p.label}
            status={p.status}
            tooltip={p.tooltip}
            onClick={(e) => {
              e.stopPropagation();
              if (p.status === 'pending') return;
              onPinClick?.(p.annotationId);
            }}
          />
        );
      })}
    </div>
  );
}

function pinKey(p: PinDescriptor): string {
  if ('textOffset' in p.anchor)
    return `t:${p.anchor.path}:${p.anchor.textOffset}:${p.anchor.subX ?? 0.5}:${p.anchor.subY ?? 0.5}`;
  return `e:${p.anchor.path}:${p.anchor.offsetX}:${p.anchor.offsetY}`;
}

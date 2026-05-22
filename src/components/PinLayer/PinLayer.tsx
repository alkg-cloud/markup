'use client';
import { type RefObject, useCallback, useLayoutEffect, useRef } from 'react';
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
  /** Published pin descriptors — one per (annotationId, anchorIndex). */
  pins: PinDescriptor[];
  /** Draft pins for the current in-flight DraftCard. Rendered in the
   *  `pending` visual state with `data-pin-kind="draft"`; the click
   *  handler dispatches `onDraftPinClick(index)` so the parent can drop
   *  the pin from the draft (with a fade-out via `removingPinIndex`). */
  draftPins?: Anchor[];
  /** Color index used for ALL draft pins — matches the optimistic
   *  insert palette used when the draft is sent. */
  draftColorIndex?: number;
  /** Index of the draft pin currently fading out. The Pin row with this
   *  index renders `data-removing="true"` so the CSS opacity transition
   *  runs; once the animation finishes, the parent strips the pin from
   *  `draftPins` and clears this index. */
  removingPinIndex?: number | null;
  /** Fired when a published pin is clicked. */
  onPublishedPinClick?: (annotationId: string) => void;
  /** Fired when a draft pin is clicked. */
  onDraftPinClick?: (pinIndex: number) => void;
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
 * Renders the union of published pins (one per `annotation.anchor`) and
 * draft pins (one per `draftPins[i]`) so the canvas reflects the live
 * draft as the user clicks.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §6.
 */
export function PinLayer({
  canvasRootRef,
  pins,
  draftPins = [],
  draftColorIndex = 0,
  removingPinIndex = null,
  onPublishedPinClick,
  onDraftPinClick,
  repositionKey,
}: PinLayerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const pinElsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const getPins = useCallback(
    function* (): Generator<[HTMLElement, Anchor]> {
      for (const p of pins) {
        const key = publishedKey(p);
        const el = pinElsRef.current.get(key);
        if (el) yield [el, p.anchor];
      }
      for (let i = 0; i < draftPins.length; i++) {
        const anchor = draftPins[i];
        if (!anchor) continue;
        const key = draftKey(i, anchor);
        const el = pinElsRef.current.get(key);
        if (el) yield [el, anchor];
      }
    },
    [pins, draftPins],
  );

  const { repositionAll } = useAnchoredPins({
    canvasRootRef,
    pinLayerRef: layerRef,
    getPins,
  });

  // Re-position whenever the pin list changes (new pin added, removed,
  // anchor edited) OR when the parent bumps `repositionKey` to signal a
  // layout change (zoom, fullscreen, iframe load) that the hook's
  // ResizeObserver / scroll listeners don't catch.
  //
  // Use `useLayoutEffect` so the recompute runs AFTER React commits the
  // new props/state (e.g. the iframe's `transform: scale(zoom)` is
  // already applied to the DOM) but BEFORE paint. A `useMemo` on the
  // same deps would fire during render — when the DOM still reflects
  // the previous zoom — and read stale layout.
  useLayoutEffect(() => {
    repositionAll();
  }, [pins, draftPins, repositionAll, repositionKey]);

  return (
    <div ref={layerRef} className={styles.pinLayer} aria-hidden="false">
      {pins.map((p) => {
        const key = publishedKey(p);
        return (
          <Pin
            key={key}
            ref={(el: HTMLButtonElement | null) => {
              if (el) pinElsRef.current.set(key, el);
              else pinElsRef.current.delete(key);
            }}
            annotationId={p.annotationId}
            kind="published"
            colorIndex={p.colorIndex}
            label={p.label}
            status={p.status}
            tooltip={p.tooltip}
            onClick={(e) => {
              e.stopPropagation();
              onPublishedPinClick?.(p.annotationId);
            }}
          />
        );
      })}
      {draftPins.map((anchor, i) => {
        const key = draftKey(i, anchor);
        return (
          <Pin
            key={key}
            ref={(el: HTMLButtonElement | null) => {
              if (el) pinElsRef.current.set(key, el);
              else pinElsRef.current.delete(key);
            }}
            annotationId={`__draft-${i}`}
            kind="draft"
            pinIndex={i}
            colorIndex={draftColorIndex}
            label={i + 1}
            status="pending"
            removing={removingPinIndex === i}
            onClick={(e) => {
              e.stopPropagation();
              if (removingPinIndex === i) return;
              onDraftPinClick?.(i);
            }}
          />
        );
      })}
    </div>
  );
}

function pinPathKey(a: Anchor): string {
  if ('textOffset' in a) return `t:${a.path}:${a.textOffset}:${a.subX ?? 0.5}:${a.subY ?? 0.5}`;
  return `e:${a.path}:${a.offsetX}:${a.offsetY}`;
}

function publishedKey(p: PinDescriptor): string {
  return `pub:${p.annotationId}:${pinPathKey(p.anchor)}`;
}

function draftKey(i: number, a: Anchor): string {
  return `draft:${i}:${pinPathKey(a)}`;
}

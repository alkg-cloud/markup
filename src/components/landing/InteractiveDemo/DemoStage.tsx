'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnnotationCard } from '@/components/AnnotationCard/AnnotationCard';
import { AnnotationsRail } from '@/components/AnnotationsRail/AnnotationsRail';
import { CanvasToolbar } from '@/components/CanvasToolbar/CanvasToolbar';
import { useViewerFullscreen } from '@/components/MockupViewer/useViewerFullscreen';
import { DEFAULT_VIEWPORT, type ViewportState } from '@/components/MockupViewer/viewport-presets';
import { type PinDescriptor, PinLayer } from '@/components/PinLayer';
import type { Anchor } from '@/lib/anchoring';
import { Eyebrow } from '../primitives/Eyebrow';
import { Section } from '../primitives/Section';
import { DemoMockup } from './DemoMockup';
import styles from './DemoStage.module.css';
import { toBadges, toCardProps } from './demoAdapter';
import { useDemoStore } from './useDemoStore';

export function DemoStage() {
  const { state, actions } = useDemoStore();
  const [resetConfirm, setResetConfirm] = useState(false);
  // The real AnnotationCard treats `threadOpen` as a parent-owned
  // accordion — track which card is expanded so only one thread is open
  // at a time. Defaults to the selected annotation on mount.
  const [openThreadId, setOpenThreadId] = useState<string | null>(state.selectedAnnotId);
  const stageRef = useRef<HTMLDivElement | null>(null);
  // The shell (topbar + stage) is what the Fullscreen API targets — that
  // way the topbar stays visible in fullscreen and the user keeps Reset
  // demo within reach.
  const shellRef = useRef<HTMLDivElement | null>(null);
  // Zoom + viewport state matches what the product's AppMainViewer keeps
  // in `useState`/`useViewport` — DemoMockup mirrors ViewerCanvas's
  // outer/inner scaling structure so the same numbers flow through.
  const [zoom, setZoom] = useState(1);
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT);
  const { isFullscreen, toggle: toggleFullscreen } = useViewerFullscreen(shellRef);
  // DemoMockup writes the iframe's documentElement into this ref on load.
  // `<PinLayer>` reads from it via `canvasRootRef` to resolve anchors
  // against the mockup DOM — same wiring AppMainViewer uses.
  const canvasRootRef = useRef<Element | null>(null);
  // Bumped by DemoMockup on iframe load AND when zoom/viewport change,
  // so the anchoring runtime re-projects pins onto the fresh layout.
  const [repositionKey, setRepositionKey] = useState(0);

  // Stable callbacks — DemoMockup's iframe-load effect uses these in its
  // dep array. Recreating them every render re-binds the iframe click
  // listener AND re-fires onIframeLoad → setRepositionKey → re-render
  // loop (React error #185 in prod, "Maximum update depth exceeded").
  const onCanvasClick = useCallback(
    (anchor: Anchor) => {
      if (state.tool !== 'pin') return;
      const body = window.prompt('Annotation body:');
      if (!body?.trim()) return;
      actions.addAnnotation({ anchor, body });
      actions.setTool('select');
    },
    [state.tool, actions],
  );
  const onIframeLoad = useCallback(() => setRepositionKey((k) => k + 1), []);

  function onReset() {
    // Functional updater reads the LATEST state, not the closure-captured
    // value — two rapid clicks (before React re-renders) would otherwise both
    // see `resetConfirm === false` and just re-arm without ever firing reset.
    setResetConfirm((prev) => {
      if (!prev) {
        setTimeout(() => setResetConfirm(false), 3000);
        return true;
      }
      actions.reset();
      return false;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input,textarea,[contenteditable]')) return;
      if (e.key === 'p' || e.key === 'P') actions.setTool('pin');
      if (e.key === 'v' || e.key === 'V') actions.setTool('select');
      if (e.key === 'r' || e.key === 'R') onReset();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetConfirm, actions]);

  // Bump repositionKey whenever zoom or viewport changes — useAnchoredPins
  // also catches these via ResizeObserver, but the explicit bump avoids
  // a one-frame stale-position flash on the rAF-less synchronous path.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(
    () => setRepositionKey((k) => k + 1),
    [zoom, viewport.mode, viewport.width, viewport.height],
  );

  // Build PinDescriptor[] from the demo state. Color, label, and status
  // mirror the AppMain wiring — selected annotation gets `status: active`
  // so the published pin highlights.
  const pins: PinDescriptor[] = state.annotations.flatMap((a, idx) =>
    a.pins.map((p) => ({
      annotationId: a.id,
      colorIndex: a.colorIndex,
      label: idx + 1,
      anchor: p.anchor,
      status: state.selectedAnnotId === a.id ? ('active' as const) : ('idle' as const),
    })),
  );

  return (
    <Section width="wide" id="demo">
      <Eyebrow>Try without signing up</Eyebrow>
      <h2 className={styles.h2}>Pin it yourself.</h2>
      <p className={styles.lead}>
        A live Markup surface, running on your browser. Drop pins, write annotations, react, reply —
        everything persists in <code>localStorage</code> so the next visitor finds a clean slate.{' '}
        <strong>Reset</strong> any time.
      </p>
      <div className={styles.shell} ref={shellRef}>
        <div className={styles.topbar}>
          <span className={styles.badge}>Demo mode</span>
          <span className={styles.title}>Lumen Coffee — Hero v3</span>
          <div className={styles.status}>
            <span className={styles.live}>localStorage only · no server</span>
            <button type="button" className={styles.reset} onClick={onReset}>
              {resetConfirm ? '⚠ Click again to confirm' : '↻ Reset demo'}
            </button>
          </div>
        </div>
        <div className={styles.stage} ref={stageRef}>
          <DemoMockup
            onCanvasClick={onCanvasClick}
            cursor={state.tool === 'pin' ? 'crosshair' : 'default'}
            zoom={zoom}
            viewport={viewport}
            setViewport={setViewport}
            canvasRootRef={canvasRootRef}
            onIframeLoad={onIframeLoad}
          />
          <PinLayer
            canvasRootRef={canvasRootRef}
            pins={pins}
            onPublishedPinClick={(id) => {
              actions.selectAnnotation(id);
              setOpenThreadId(id);
            }}
            repositionKey={repositionKey}
          />
          <AnnotationsRail
            boundsRef={stageRef}
            badges={toBadges(state)}
            activeAnnotationId={state.selectedAnnotId}
            onBadgeClick={(id) => {
              actions.selectAnnotation(id);
              setOpenThreadId(id);
            }}
          >
            {state.annotations.map((a, i) => {
              const props = toCardProps(state, a, i, {
                onActivate: () => {
                  actions.selectAnnotation(a.id);
                  setOpenThreadId(a.id);
                },
                onPostReply: (body) => actions.addReply(a.threadId, body),
                onCommentReact: (commentId, emoji) => actions.toggleReaction(commentId, emoji),
                onStatusChange: () => actions.cycleStatus(a.threadId),
                threadOpen: openThreadId === a.id,
                onThreadToggle: () => setOpenThreadId((prev) => (prev === a.id ? null : a.id)),
              });
              if (!props) return null;
              return <AnnotationCard key={a.id} {...props} />;
            })}
          </AnnotationsRail>
          <CanvasToolbar
            boundsRef={stageRef}
            onZoomChange={setZoom}
            isFullscreen={isFullscreen}
            onFullscreenToggle={toggleFullscreen}
            viewport={viewport}
            setViewport={setViewport}
          />
        </div>
      </div>
    </Section>
  );
}

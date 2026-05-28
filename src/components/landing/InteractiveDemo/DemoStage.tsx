'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnnotationCard } from '@/components/AnnotationCard/AnnotationCard';
import { AnnotationsRail } from '@/components/AnnotationsRail/AnnotationsRail';
import { CanvasToolbar } from '@/components/CanvasToolbar/CanvasToolbar';
import { DraftCard } from '@/components/DraftCard';
import type { Draft, DraftStatus } from '@/components/MockupViewer/draft-types';
import { MAX_PINS } from '@/components/MockupViewer/draft-types';
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

const REMOVE_PIN_FADE_MS = 220;

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

  // Draft state shaped exactly like AppMainViewer's. `draft === null`
  // means no draft is open; while it exists, every iframe click appends
  // an Anchor to draft.pins (up to MAX_PINS), and clicks on a draft pin
  // remove it. Body comes from the DraftCard's textarea. Status drives
  // the DraftCard's footer microcopy + button states.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('unsaved');
  const [removingPinIndex, setRemovingPinIndex] = useState<number | null>(null);

  const nextColorIndex = (state.annotations.length % 5) as 0 | 1 | 2 | 3 | 4;

  // ── Draft actions ──────────────────────────────────────────────────
  const openDraft = useCallback(() => {
    setDraft((d) => d ?? { body: '', pins: [], lastSavedAt: null, hasUnsavedChanges: false });
    setDraftStatus('unsaved');
  }, []);

  const cancelDraft = useCallback(() => {
    setDraft(null);
    setDraftStatus('unsaved');
    setRemovingPinIndex(null);
  }, []);

  const sendDraft = useCallback(() => {
    if (!draft || draft.body.length === 0) return;
    setDraftStatus('sending');
    actions.addAnnotation({ pins: draft.pins, body: draft.body });
    setDraft(null);
    setDraftStatus('unsaved');
    setRemovingPinIndex(null);
  }, [draft, actions]);

  // The product wires `onSave` to debounced localStorage persistence via
  // `useDraftPersistence`. The demo persists only the FINALIZED
  // annotation; the in-flight draft is local React state. Match the
  // contract anyway so DraftCard's UI (e.g. ⌘S, "Draft saved Ns ago")
  // shows a sensible state — we treat saves as instantaneous + a no-op.
  const saveDraft = useCallback(() => {
    setDraftStatus('saving');
    setDraft((d) => (d ? { ...d, lastSavedAt: Date.now(), hasUnsavedChanges: false } : null));
    setDraftStatus('saved');
  }, []);

  const handleBodyChange = useCallback((body: string) => {
    setDraft((d) => (d ? { ...d, body, hasUnsavedChanges: true } : null));
    setDraftStatus('unsaved');
  }, []);

  // Click on iframe while a draft is open → append the anchor. Until the
  // user hits "+", clicks do nothing (matches the product — pin mode is
  // gated by draft existence, not a separate tool flag).
  const onCanvasClick = useCallback((anchor: Anchor) => {
    setDraft((d) => {
      if (!d) return d;
      if (d.pins.length >= MAX_PINS) return d;
      return { ...d, pins: [...d.pins, anchor], hasUnsavedChanges: true };
    });
    setDraftStatus('unsaved');
  }, []);

  const onIframeLoad = useCallback(() => setRepositionKey((k) => k + 1), []);

  // Click on a draft pin → fade out, then splice. Mirrors AppMainViewer's
  // `removeDraftPin`: PinLayer renders the pin with data-removing="true"
  // while the opacity transition runs; once it's complete we drop the
  // pin from draft.pins and clear the marker.
  const removeDraftPin = useCallback((pinIndex: number) => {
    setRemovingPinIndex(pinIndex);
    setTimeout(() => {
      setDraft((d) =>
        d
          ? {
              ...d,
              pins: d.pins.filter((_, i) => i !== pinIndex),
              hasUnsavedChanges: true,
            }
          : null,
      );
      setRemovingPinIndex(null);
      setDraftStatus('unsaved');
    }, REMOVE_PIN_FADE_MS);
  }, []);

  function onReset() {
    setResetConfirm((prev) => {
      if (!prev) {
        setTimeout(() => setResetConfirm(false), 3000);
        return true;
      }
      actions.reset();
      setDraft(null);
      setDraftStatus('unsaved');
      setRemovingPinIndex(null);
      return false;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input,textarea,[contenteditable]')) return;
      if (e.key === 'r' || e.key === 'R') onReset();
      if (e.key === 'Escape' && draft) cancelDraft();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetConfirm, draft, cancelDraft]);

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

  const draftActive = draft !== null;
  const cursor = draftActive ? 'crosshair' : 'default';

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
            cursor={cursor}
            zoom={zoom}
            viewport={viewport}
            setViewport={setViewport}
            canvasRootRef={canvasRootRef}
            onIframeLoad={onIframeLoad}
            iframeClickable={draftActive}
          />
          <PinLayer
            canvasRootRef={canvasRootRef}
            pins={pins}
            draftPins={draft?.pins}
            draftColorIndex={nextColorIndex}
            removingPinIndex={removingPinIndex}
            onPublishedPinClick={(id) => {
              actions.selectAnnotation(id);
              setOpenThreadId(id);
            }}
            onDraftPinClick={removeDraftPin}
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
            onCreate={openDraft}
            draft={draftActive ? { active: true } : null}
            forceExpand={draftActive}
            renderDraft={
              draft
                ? () => (
                    <DraftCard
                      draft={draft}
                      status={draftStatus}
                      onBodyChange={handleBodyChange}
                      onCancel={cancelDraft}
                      onSave={saveDraft}
                      onSend={sendDraft}
                    />
                  )
                : undefined
            }
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

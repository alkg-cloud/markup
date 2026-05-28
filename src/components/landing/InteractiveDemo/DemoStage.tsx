'use client';

import { useEffect, useRef, useState } from 'react';
import { AnnotationCard } from '@/components/AnnotationCard/AnnotationCard';
import { AnnotationsRail } from '@/components/AnnotationsRail/AnnotationsRail';
import { CanvasToolbar } from '@/components/CanvasToolbar/CanvasToolbar';
import { DEFAULT_VIEWPORT, type ViewportState } from '@/components/MockupViewer/viewport-presets';
import { Eyebrow } from '../primitives/Eyebrow';
import { Section } from '../primitives/Section';
import { DemoMockup } from './DemoMockup';
import { DemoPinLayer } from './DemoPinLayer';
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
  // The real CanvasToolbar accepts a zoom callback. We track it locally so
  // the iframe's transform: scale() ties to the toolbar — for the demo
  // it's mostly cosmetic since the iframe is fixed-size, but the visual
  // dock comes for free.
  const [zoom, setZoom] = useState(1);
  // Viewport selector — drives the device-frame size in DemoMockup.
  // `fit` is the default so the demo opens edge-to-edge; switching to
  // desktop/tablet/mobile sizes the iframe to that fixed preset.
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT);

  function onCanvasClick(xPct: number, yPct: number) {
    if (state.tool !== 'pin') return;
    const body = window.prompt('Annotation body:');
    if (!body?.trim()) return;
    actions.addAnnotation({ xPct, yPct, body });
    actions.setTool('select');
  }

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

  return (
    <Section width="wide" id="demo">
      <Eyebrow>Try without signing up</Eyebrow>
      <h2 className={styles.h2}>Pin it yourself.</h2>
      <p className={styles.lead}>
        A live Markup surface, running on your browser. Drop pins, write annotations, react, reply —
        everything persists in <code>localStorage</code> so the next visitor finds a clean slate.{' '}
        <strong>Reset</strong> any time.
      </p>
      <div className={styles.shell}>
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
          >
            <DemoPinLayer
              annotations={state.annotations}
              selectedId={state.selectedAnnotId}
              onSelect={(id) => {
                actions.selectAnnotation(id);
                setOpenThreadId(id);
              }}
            />
          </DemoMockup>
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
            isFullscreen={false}
            viewport={viewport}
            setViewport={setViewport}
          />
        </div>
      </div>
    </Section>
  );
}

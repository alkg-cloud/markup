'use client';

import { useEffect, useState } from 'react';
import { Eyebrow } from '../primitives/Eyebrow';
import { Section } from '../primitives/Section';
import { DemoMockup } from './DemoMockup';
import { DemoPinLayer } from './DemoPinLayer';
import { DemoRail } from './DemoRail';
import styles from './DemoStage.module.css';
import { DemoToolbar } from './DemoToolbar';
import { STORAGE_KEY } from './seeds';
import { useDemoStore } from './useDemoStore';

export function DemoStage() {
  const { state, actions } = useDemoStore();
  const [resetConfirm, setResetConfirm] = useState(false);

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

  const openCount = state.threads.filter((t) => t.status === 'open').length;
  const resolvedCount = state.threads.filter((t) => t.status === 'resolved').length;

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
        <DemoToolbar tool={state.tool} onChange={actions.setTool} />
        <div className={styles.stage}>
          <DemoMockup
            onCanvasClick={onCanvasClick}
            cursor={state.tool === 'pin' ? 'crosshair' : 'default'}
          >
            <DemoPinLayer
              annotations={state.annotations}
              selectedId={state.selectedAnnotId}
              onSelect={actions.selectAnnotation}
            />
          </DemoMockup>
          <DemoRail
            annotations={state.annotations}
            threads={state.threads}
            messages={state.messages}
            reactions={state.reactions}
            selectedId={state.selectedAnnotId}
            onSelect={actions.selectAnnotation}
            onCycleStatus={actions.cycleStatus}
            onToggleReaction={actions.toggleReaction}
            onAddReply={actions.addReply}
          />
        </div>
        <div className={styles.foot}>
          <span>
            <strong>{state.annotations.length} annotations</strong> · {openCount} open ·{' '}
            {resolvedCount} resolved · stored at <code>localStorage.{STORAGE_KEY}</code>
          </span>
          <span className={styles.footRight}>
            Real <code>&lt;Toolbar&gt;</code>, <code>&lt;AnnotationCard&gt;</code>,{' '}
            <code>&lt;ReactionPicker&gt;</code> components
          </span>
        </div>
      </div>
    </Section>
  );
}

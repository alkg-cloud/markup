'use client';
/**
 * DemoStage — the landing-page interactive demo. Renders a full
 * `<ViewerShell>` driven by `useDemoStore` (localStorage-backed) through
 * the `useDemoAdapter` bridge. Shares the exact presentation + state
 * machine the production viewer runs on; only the data plane and
 * mutation callbacks are demo-specific.
 *
 * See `docs/superpowers/specs/2026-05-28-tldraw-removal-and-viewer-shell-design.md`
 * for the layering rationale.
 */

import { useState } from 'react';
import { ViewerShell } from '@/components/MockupViewer/ViewerShell';
import { Eyebrow } from '../primitives/Eyebrow';
import { Section } from '../primitives/Section';
import styles from './DemoStage.module.css';
import { DEMO_CURRENT_USER, useDemoAdapter } from './demoAdapter';
import { SAMPLE_HTML } from './sample-mockup.html';
import { useDemoStore } from './useDemoStore';

export function DemoStage() {
  const { state, actions } = useDemoStore();
  const adapter = useDemoAdapter(state, actions);
  // Two-click reset: first click arms the button (3-second window), second
  // click commits. Avoids accidental wipes when a user lands near the
  // topbar.
  const [resetConfirm, setResetConfirm] = useState(false);

  function onReset() {
    setResetConfirm((prev) => {
      if (!prev) {
        setTimeout(() => setResetConfirm(false), 3000);
        return true;
      }
      actions.reset();
      return false;
    });
  }

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
        <div className={styles.stage}>
          <ViewerShell
            scopeId="demo"
            userId={DEMO_CURRENT_USER}
            mockupSrc={{ kind: 'srcDoc', html: SAMPLE_HTML }}
            annotations={adapter.annotations}
            draftPersistence={{ enabled: false }}
            {...adapter.handlers}
          />
        </div>
      </div>
    </Section>
  );
}

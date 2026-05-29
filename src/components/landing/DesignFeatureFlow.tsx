import type { ReactNode } from 'react';
import styles from './DesignFeatureFlow.module.css';
import { Eyebrow } from './primitives/Eyebrow';
import { Section } from './primitives/Section';

type Phase = {
  index: string;
  title: string;
  body: ReactNode;
  markup: ReactNode;
};

const PHASES: Phase[] = [
  {
    index: '00',
    title: 'Discovery',
    body: 'Detect framework + ecosystem, surface CLAUDE.md rules, pick a UI strategy.',
    markup: 'Strategy persists per repo. Future features reuse it.',
  },
  {
    index: '01',
    title: 'Design brainstorm',
    body: 'One self-contained HTML mockup with a live tweaker for variants, density, accent.',
    markup: 'Hosted URL. Reviewers drop DOM-anchored pins instead of pasting screenshots.',
  },
  {
    index: '02',
    title: 'Promote',
    body: 'Bake locked tweaker choices, strip scaffolding, become a Design System file.',
    markup: 'Every iteration is a version. The promotion diff is the audit trail.',
  },
  {
    index: '03',
    title: 'Tech brainstorm',
    body: 'Architecture spec scoped to the DS file. No UI re-design at this layer.',
    markup: (
      <>
        Agent calls <code>GET /api/agent/context/[id]</code> — annotation + HTML + diff in one
        request.
      </>
    ),
  },
  {
    index: '04',
    title: 'Plan + execute',
    body: 'TDD plan; subagents implement; DS edits are first-class plan tasks.',
    markup: (
      <>
        Patches land via <code>PATCH /api/mockups/[id]/version-patch</code>. Reviewer sees the diff
        inline.
      </>
    ),
  },
  {
    index: '05',
    title: 'Visual + behavior QA',
    body: 'Live route vs DS reference. Chrome MCP drives the state matrix; deltas loop until parity.',
    markup: 'Regressions reopen the loop on the same pin. Same surface, same protocol, no rebuild.',
  },
];

export function DesignFeatureFlow() {
  return (
    <Section id="design-loop">
      <Eyebrow>The design-feature skill</Eyebrow>
      <h2 className={styles.h2}>Six phases. Hosted, pinned, patched.</h2>
      <p className={styles.lead}>
        <code>design-feature</code> orchestrates the whole lifecycle of a user-visible feature —
        from "I want a pricing card" to a parity check against the Design System. Markup is the
        substrate that turns every phase into a hosted, addressable artifact: a pin, a version, a
        diff.
      </p>

      <DiagramRail />

      <ol className={styles.grid}>
        {PHASES.map((p) => (
          <li key={p.index} className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.ix} aria-hidden="true">
                {p.index}
              </span>
              <h4 className={styles.cardTitle}>{p.title}</h4>
            </div>
            <p className={styles.cardBody}>{p.body}</p>
            <div className={styles.boost}>
              <span className={styles.boostLabel} aria-hidden="true">
                Markup ↗
              </span>
              <span className={styles.boostText}>{p.markup}</span>
            </div>
          </li>
        ))}
      </ol>

      <p className={styles.coda}>
        Mockup hosted on the same surface as production. Pins anchor to the same DOM. The agent
        reads context, patches HTML, and replies on the thread — every step in <code>0→5</code>{' '}
        leaves an addressable trail.
      </p>
    </Section>
  );
}

function DiagramRail() {
  return (
    <svg
      className={styles.rail}
      viewBox="0 0 1200 96"
      preserveAspectRatio="none"
      role="img"
      aria-label="Six-phase pipeline: discovery, brainstorm, promote, tech spec, build, QA."
    >
      <defs>
        <linearGradient id="dff-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.05" />
          <stop offset="12%" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="88%" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <line
        x1="60"
        x2="1140"
        y1="48"
        y2="48"
        stroke="url(#dff-line)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {[100, 280, 460, 640, 820, 1000].map((cx, i) => (
        <g key={cx}>
          <circle
            cx={cx}
            cy="48"
            r="14"
            fill="var(--bg-elevated)"
            stroke="var(--accent)"
            strokeWidth="1"
            strokeOpacity="0.45"
          />
          <text
            x={cx}
            y="52"
            textAnchor="middle"
            className={styles.railText}
            fontSize="10"
            fill="var(--accent)"
            fontFamily="var(--font-mono)"
          >
            0{i}
          </text>
        </g>
      ))}
      {/* terminal arrow */}
      <path d="M 1140 48 L 1132 44 L 1132 52 Z" fill="var(--accent)" fillOpacity="0.55" />
    </svg>
  );
}

import type { ReactNode } from 'react';
import styles from './DesignFeatureFlow.module.css';
import { Eyebrow } from './primitives/Eyebrow';
import { PillLink } from './primitives/PillButton';
import { Section } from './primitives/Section';

const SKILL_REPO_URL = 'https://github.com/AlexandreCamillo/markup-design-toolkit';

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
      <Eyebrow>Pair Markup with a skill</Eyebrow>
      <h2 className={styles.h2}>Lock the design before you discuss the build.</h2>
      <p className={styles.lead}>
        <code>design-feature</code> is a community skill that gets the most out of your AI agent and
        Markup. It runs the agent through a UI/UX brainstorm, hands you a live tweaker to explore
        every option it proposes, and only opens the implementation conversation once the design is
        locked.
      </p>

      <div className={styles.ctaRow}>
        <PillLink
          variant="ghost"
          href={SKILL_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.repoLink}
        >
          markup-design-toolkit <span aria-hidden="true">↗</span>
        </PillLink>
        <span className={styles.ctaHint}>
          Drop the skill into your agent and run it on this repo.
        </span>
      </div>

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
            <div className={styles.boost}>{p.markup}</div>
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

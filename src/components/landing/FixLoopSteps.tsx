import type { ReactNode } from 'react';
import styles from './FixLoopSteps.module.css';
import { Eyebrow } from './primitives/Eyebrow';
import { Section } from './primitives/Section';

const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: 'Annotate',
    body: (
      <>
        Reviewer or agent posts a pin + thread to <code>POST /api/mockups/[id]/annotations</code>.
        Body required; pins optional.
      </>
    ),
  },
  {
    title: 'Context',
    body: (
      <>
        <code>GET /api/agent/context/[id]</code> returns the annotation, the current inline HTML,
        and a diff since creation — in one request.
      </>
    ),
  },
  {
    title: 'Patch',
    body: (
      <>
        <code>PATCH /api/mockups/[id]/version-patch</code> accepts standard unified diffs against a
        base version. Atomic, append-only.
      </>
    ),
  },
  {
    title: 'Reply',
    body: (
      <>
        <code>POST /api/threads/[id]/reply</code> closes the loop. The reviewer sees the diff inline
        and resolves.
      </>
    ),
  },
];

export function FixLoopSteps() {
  return (
    <Section id="how-it-works">
      <Eyebrow>The fix loop, end to end</Eyebrow>
      <h2 className={styles.h2}>Four calls. Five to fifteen kilobytes.</h2>
      <p className={styles.lead}>
        A reviewer drops a pin. The agent fetches one aggregated context payload, applies a patch,
        and replies on the thread. That's the loop — same shape whether the agent is Claude Code,
        Cursor, Aider, or your own CI script.
      </p>
      <ol className={styles.steps}>
        {STEPS.map((s, i) => (
          <li key={s.title} className={styles.step}>
            <span className={styles.ix} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h4>{s.title}</h4>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

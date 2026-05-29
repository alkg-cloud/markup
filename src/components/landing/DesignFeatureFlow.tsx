import styles from './DesignFeatureFlow.module.css';
import { Eyebrow } from './primitives/Eyebrow';
import { PillLink } from './primitives/PillButton';
import { Section } from './primitives/Section';

const SKILL_REPO_URL = 'https://github.com/alkg-cloud/design-skills';

type Phase = {
  index: string;
  title: string;
  body: string;
  markup: string;
};

const PHASES: Phase[] = [
  {
    index: '00',
    title: 'Discovery',
    body: 'The agent scans your stack, your conventions, and your design rules before suggesting anything.',
    markup:
      'With Markup, the chosen direction is saved to the project so future features start from the same baseline.',
  },
  {
    index: '01',
    title: 'Design brainstorm',
    body: 'The agent proposes several visual directions in a single live mockup. You pick variant, density, accent.',
    markup:
      'With Markup, the mockup goes online with one click. Reviewers leave pins straight on the artwork instead of pasting screenshots into chat.',
  },
  {
    index: '02',
    title: 'Lock the design',
    body: 'When you approve, the chosen options are baked in. The mockup graduates to your Design System.',
    markup:
      'With Markup, every round of iteration is a saved version. You can scrub back to any earlier proposal at any time.',
  },
  {
    index: '03',
    title: 'Tech brainstorm',
    body: 'The implementation conversation only opens after the design is locked. No UI re-design at this layer.',
    markup:
      'With Markup, the agent already sees the final mockup and the full review thread before the technical discussion starts.',
  },
  {
    index: '04',
    title: 'Plan + build',
    body: 'A TDD plan splits the work into small tasks. Sub-agents implement them in parallel against the locked design.',
    markup:
      'With Markup, the agent ships each change as a versioned patch. You see exactly what was changed and reply on the original thread.',
  },
  {
    index: '05',
    title: 'Visual + behavior QA',
    body: 'A browser-driven check compares the live build against the Design System reference and loops on any drift.',
    markup:
      'With Markup, any regression reopens the same review surface. You drop a new pin and the loop starts again, no rebuild needed.',
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
          alkg-cloud/design-skills <span aria-hidden="true">↗</span>
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
        The mockup lives on the same surface as production. Pins anchor to the same DOM. The agent
        reads context, patches HTML, and replies on the thread, so every step from <code>0</code> to{' '}
        <code>5</code> leaves an addressable trail.
      </p>
    </Section>
  );
}

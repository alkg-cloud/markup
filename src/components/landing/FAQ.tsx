import styles from './FAQ.module.css';
import { Eyebrow } from './primitives/Eyebrow';
import { Section } from './primitives/Section';

const FAQS = [
  {
    q: 'Does it work without an LLM?',
    a: "Yes. The cookie-session reviewer UI is the same surface, with no required AI. The agent API is opt-in — issue a bearer token only if you want an automated client (or just don't issue any).",
    open: true,
  },
  {
    q: 'Why SQLite instead of Postgres?',
    a: 'Markup is sized for small-to-medium teams self-hosting on a 256 MB box. SQLite in WAL mode handles the workload; a single mounted volume is dramatically simpler to back up. If you outgrow it, the Prisma schema ports to Postgres without surgery.',
  },
  {
    q: 'Can I use it with Claude Code / Cursor / Aider?',
    a: 'Yes. The agent API is just an HTTP contract — bearer token in, annotation context out, unified diff back. Any dev assistant that can call curl can drive Markup. The docs show example loops.',
  },
  {
    q: 'How are pin coordinates persistent?',
    a: 'Pins anchor to DOM nodes via text-anchor and element-anchor selectors that are resilient to layout drift. The server resolves them on render so the pin reflows naturally with viewport, zoom, fullscreen, and visual updates.',
  },
];

export function FAQ() {
  return (
    <Section width="narrow" id="faq">
      <Eyebrow muted>Frequently asked</Eyebrow>
      <h2 className={styles.h2}>The questions reviewers always ask.</h2>
      <div className={styles.list}>
        {FAQS.map((f) => (
          <details key={f.q} className={styles.item} open={f.open}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

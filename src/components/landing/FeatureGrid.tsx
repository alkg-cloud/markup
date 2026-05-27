import styles from './FeatureGrid.module.css';
import { Eyebrow } from './primitives/Eyebrow';
import { Section } from './primitives/Section';

const FEATURES = [
  {
    title: 'Inline DraftCard',
    body: 'Mounted at the top of the rail while drafting. Three terminal actions. Persists across reloads.',
  },
  {
    title: 'Pin-based review',
    body: 'Click anywhere on the live mockup. Pin reflows with the layout via DOM-anchored coordinates.',
  },
  {
    title: 'Versioning',
    body: 'Every upload is immutable. Side-by-side and overlay diff views compare any two versions.',
  },
  {
    title: 'Agent context',
    body: 'Single-call aggregator returns annotation, inline HTML, and a unified diff against creation.',
  },
  {
    title: 'Cookie or Bearer',
    body: 'Browser sessions and agent tokens hit the same routes. One contract, two front doors.',
  },
  {
    title: 'Single-mount deploy',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: intentional literal — ${DATA_DIR} is display text, not an interpolation
    body: 'All state under ${DATA_DIR}. SQLite WAL. Online backup via Litestream supported.',
  },
];

export function FeatureGrid() {
  return (
    <Section>
      <Eyebrow muted>What ships in the box</Eyebrow>
      <h2 className={styles.h2}>The first commit was a working agent API.</h2>
      <div className={styles.grid}>
        {FEATURES.map((f, i) => (
          <div key={f.title} className={styles.feat}>
            <div className={styles.ix} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </div>
            <h4>{f.title}</h4>
            <p>{f.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

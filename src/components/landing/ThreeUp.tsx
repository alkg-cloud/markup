import type { IconType } from 'react-icons';
import { VscCode, VscPass, VscSymbolMethod } from 'react-icons/vsc';
import { Eyebrow } from './primitives/Eyebrow';
import { Section } from './primitives/Section';
import styles from './ThreeUp.module.css';

const CARDS: { Icon: IconType; title: string; body: string }[] = [
  {
    Icon: VscPass,
    title: 'The iframe is the truth',
    body: 'Pins anchor to DOM nodes. Reflow, zoom, fullscreen, viewport changes: the pin stays on the element it was dropped on. No screenshot drift.',
  },
  {
    Icon: VscSymbolMethod,
    title: 'Single-mount deploy',
    body: 'One docker container. SQLite + filesystem. No PostgreSQL, no Redis, no S3. Mount one volume, back up one tree. 256 MB is enough.',
  },
  {
    Icon: VscCode,
    title: 'An API agents can use',
    body: 'Server-side DOM resolution, computed-style extraction, unified-diff versioning. Same routes power the browser UI and autonomous orchestrators.',
  },
];

export function ThreeUp() {
  return (
    <Section id="why">
      <Eyebrow muted>Why Markup</Eyebrow>
      <h2 className={styles.h2}>Three reasons it's not just "Figma for code".</h2>
      <p className={styles.lead}>
        Not a comment layer over screenshots. A self-hosted review surface where the iframe is the
        artifact, pins are DOM-anchored, and the API is built so an AI agent can close the loop
        without a human pasting context into chat.
      </p>
      <div className={styles.grid}>
        {CARDS.map(({ Icon, title, body }) => (
          <div key={title} className={styles.card}>
            <div className={styles.icon} aria-hidden="true">
              <Icon size={20} />
            </div>
            <h3 className={styles.h3}>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

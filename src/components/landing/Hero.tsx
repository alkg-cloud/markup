'use client';

import styles from './Hero.module.css';
import { HeroVisual } from './HeroVisual';
import { Eyebrow } from './primitives/Eyebrow';
import { PillButton, PillLink } from './primitives/PillButton';
import { Section } from './primitives/Section';

export function Hero() {
  return (
    <Section className={styles.hero}>
      <div className={styles.grid}>
        <div>
          <Eyebrow>v0.2 · Self-hosted · Elastic-2.0</Eyebrow>
          <h1 className={styles.h1}>
            Pin annotations
            <br />
            for <span className={styles.accent}>live frontends</span>.
          </h1>
          <p className={styles.lead}>
            Reviewers drop teardrop pins; AI dev assistants read them as JSON and reply with unified
            diffs. Same contract, two front doors.
          </p>
          <div className={styles.cta}>
            <PillButton onClick={scrollToQuickstart}>
              Spin it up <span className={styles.kbd}>docker</span>
            </PillButton>
            <PillLink variant="ghost" href="#demo">
              Try the demo →
            </PillLink>
          </div>
          <div className={styles.meta}>
            <span>One docker container</span>
            <span>5–15 KB per fix loop</span>
            <span>DOM-anchored pins</span>
          </div>
        </div>
        <HeroVisual />
      </div>
    </Section>
  );
}

function scrollToQuickstart() {
  document.getElementById('quickstart')?.scrollIntoView({ behavior: 'smooth' });
}

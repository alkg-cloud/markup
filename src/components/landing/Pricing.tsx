import styles from './Pricing.module.css';
import { Eyebrow } from './primitives/Eyebrow';
import { Section } from './primitives/Section';

export function Pricing() {
  return (
    <Section width="narrow">
      <Eyebrow muted>Licensing, plainly</Eyebrow>
      <h2 className={styles.h2}>Free to self-host. Free for your team.</h2>
      <div className={styles.grid}>
        <div className={`${styles.card} ${styles.featured}`}>
          <Eyebrow>Recommended</Eyebrow>
          <h3>Self-host</h3>
          <div className={styles.price}>Free</div>
          <p>
            Elastic License 2.0. Run it inside your org, your CI, your homelab. No seat caps, no
            calls home.
          </p>
          <ul>
            <li>Multi-arch Docker image (amd64 + arm64)</li>
            <li>Full source on GitHub</li>
            <li>Community support via Issues</li>
          </ul>
        </div>
        <div className={styles.card}>
          <h3>Commercial hosting</h3>
          <div className={styles.price}>Reach out</div>
          <p>
            Offering Markup as a hosted service requires a separate agreement. The license blocks
            third-party SaaS resale; everything else is open.
          </p>
          <ul>
            <li>Custom CLA for code contributions</li>
            <li>Partnership terms</li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

import styles from './HeroVisual.module.css';

export function HeroVisual() {
  return (
    <div className={styles.visual}>
      <div className={styles.browserBar}>
        <span className={styles.traffic}>
          <span />
          <span />
          <span />
        </span>
        <span className={styles.urlPill}>
          <span className={styles.lock}>●</span>markup.local/m/lumen-coffee-hero
        </span>
      </div>
      <div className={styles.canvas}>
        <div className={styles.headline}>Coffee, slow.</div>
        <div className={styles.sub}>Specialty roasts, single origin, brewed in 14 cities.</div>
        <div className={styles.cta}>Order now →</div>
        <div className={styles.bgImg} />
        <Pin className={styles.p1} num={1} hue="accent" />
        <Pin className={styles.p2} num={2} hue="amber" />
        <Pin className={styles.p3} num={3} hue="violet" />
      </div>
      <div className={styles.rail}>
        <RailItem hue="accent" num={1}>
          <strong>Headline kerning is loose.</strong> Try tracking -0.02em.
        </RailItem>
        <RailItem hue="amber" num={2}>
          <strong>Sub-copy should sit closer.</strong> 6px margin-top, not 10.
        </RailItem>
        <RailItem hue="violet" num={3}>
          <strong>CTA contrast is borderline.</strong> AAA fails.
        </RailItem>
      </div>
    </div>
  );
}

type Hue = 'accent' | 'amber' | 'violet';

function Pin({ className, num, hue }: { className: string; num: number; hue: Hue }) {
  return (
    <div className={`${styles.pin} ${styles[hue]} ${className}`}>
      <span>{num}</span>
    </div>
  );
}

function RailItem({ hue, num, children }: { hue: Hue; num: number; children: React.ReactNode }) {
  return (
    <div className={`${styles.railItem} ${styles[hue]}`}>
      <div className={styles.railNum}>{num}</div>
      <div className={styles.railBody}>{children}</div>
    </div>
  );
}

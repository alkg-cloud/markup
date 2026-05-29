import { Brand } from './primitives/Brand';
import { PillLink } from './primitives/PillButton';
import styles from './Topbar.module.css';

const GITHUB_URL = 'https://github.com/alkg-cloud/markup';

export function Topbar() {
  return (
    <nav className={styles.topbar}>
      <div className={styles.inner}>
        <a href="/landing" className={styles.brandLink} aria-label="Markup home">
          <Brand size={15} />
        </a>
        <div className={styles.nav}>
          <a href="#demo">Demo</a>
          <a href="#design-loop">Design loop</a>
          <a href="#quickstart">Quickstart</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className={styles.actions}>
          <PillLink
            variant="ghost"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className={`${styles.compactBtn} ${styles.ghBtn}`}
          >
            <svg
              className={styles.ghIcon}
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.17a10.97 10.97 0 0 1 5.74 0c2.19-1.48 3.15-1.17 3.15-1.17.62 1.57.23 2.73.11 3.02.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56C20.71 21.39 24 17.08 24 12 24 5.65 18.85.5 12 .5z" />
            </svg>
            <span className={styles.ghLabel}>GitHub</span>
          </PillLink>
          <PillLink variant="primary" href="#quickstart" className={styles.compactBtn}>
            Get started <span className={styles.kbd}>docker</span>
          </PillLink>
        </div>
      </div>
    </nav>
  );
}

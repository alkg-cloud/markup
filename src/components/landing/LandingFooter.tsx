import styles from './LandingFooter.module.css';
import { Brand } from './primitives/Brand';

const GH = 'https://github.com/AlexandreCamillo/markup';

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div>
          <Brand size={15} />
          <p className={styles.tagline}>
            Self-hosted HTML mockup review for humans and the agents that ship the fix.
          </p>
        </div>
        <div>
          <h5>Product</h5>
          <ul>
            <li>
              <a href="#demo">Demo</a>
            </li>
            <li>
              <a href="#how-it-works">Agent API</a>
            </li>
            <li>
              <a href="#quickstart">Quickstart</a>
            </li>
            <li>
              <a href={`${GH}/releases`} target="_blank" rel="noopener noreferrer">
                Releases
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h5>Source</h5>
          <ul>
            <li>
              <a href={GH} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
            <li>
              <a href={`${GH}/issues`} target="_blank" rel="noopener noreferrer">
                Issues
              </a>
            </li>
            <li>
              <a href={`${GH}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer">
                Contributing
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h5>License</h5>
          <ul>
            <li>
              <a href={`${GH}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
                Elastic-2.0
              </a>
            </li>
            <li>
              <a href={`${GH}/blob/main/CLA.md`} target="_blank" rel="noopener noreferrer">
                CLA
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>© Alexandre Camillo · Elastic License 2.0</span>
        <span>Made for review loops that actually close.</span>
      </div>
    </footer>
  );
}

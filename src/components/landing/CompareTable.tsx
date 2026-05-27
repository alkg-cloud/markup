import styles from './CompareTable.module.css';
import { Eyebrow } from './primitives/Eyebrow';
import { Section } from './primitives/Section';

const ROWS = [
  { cap: 'Live frontend in the loop', us: '✓', a: '✗ (static images)', b: '✗ (design surfaces)' },
  { cap: 'DOM-anchored pins', us: '✓', a: '✗', b: 'N/A' },
  { cap: 'Single-mount self-host', us: '✓ One docker', a: 'Vendor only', b: 'Vendor only' },
  { cap: 'First-class agent API', us: '✓ Native', a: '✗', b: 'Plugin-only' },
  {
    cap: 'Fix round-trip size',
    us: '5–15 KB unified diff',
    a: 'Re-upload PNG or zip',
    b: 'Out-of-band',
  },
];

export function CompareTable() {
  return (
    <Section>
      <Eyebrow>Vs. the screenshot loop</Eyebrow>
      <h2 className={styles.h2}>How Markup compares.</h2>
      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Capability</th>
              <th scope="col" className={styles.us}>
                Markup
              </th>
              <th scope="col">Slack + screenshots</th>
              <th scope="col">Figma comments</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.cap}>
                <th scope="row">{r.cap}</th>
                <td className={styles.us}>{r.us}</td>
                <td>{r.a}</td>
                <td>{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

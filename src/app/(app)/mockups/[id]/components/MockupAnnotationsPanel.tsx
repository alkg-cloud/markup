import Link from 'next/link';
import { type VersionRow, Versions } from '../Versions';
import styles from './MockupViewer.module.css';
import { StatusPill } from './StatusPill';

interface AnnotationSummary {
  id: string;
  createdAt: string;
  threadStatus: string;
  messageCount: number;
}

interface Props {
  annotations: AnnotationSummary[];
  mockupId: string;
  currentVersionId: string;
  versions: VersionRow[];
  historyOpen: boolean;
  onHistoryOpenChange: (next: boolean) => void;
}

export function MockupAnnotationsPanel({
  annotations,
  mockupId,
  currentVersionId,
  versions,
  historyOpen,
  onHistoryOpenChange,
}: Props) {
  return (
    <aside className={styles.annotationsPanel}>
      <div className={styles.annotationsEyebrow}>
        <span className={styles.eyebrowLabel}>Annotations</span>
        <span className={styles.eyebrowCount}>{annotations.length}</span>
      </div>

      {annotations.length === 0 ? (
        <p className={styles.annotationsEmpty}>
          No annotations yet — click + Comment to capture and annotate.
        </p>
      ) : (
        <ul className={styles.annotationsList}>
          {annotations.map((a) => (
            <li key={a.id}>
              <Link
                href={`/annotations/${a.id}`}
                data-testid="annotation-card"
                className={styles.annotationRow}
              >
                <div className={styles.annotationMeta}>
                  <span className={styles.annotationTimestamp}>
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                  <StatusPill status={a.threadStatus} />
                </div>
                <span className={styles.annotationMessage}>
                  {a.messageCount} {a.messageCount === 1 ? 'message' : 'messages'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Versions
        mockupId={mockupId}
        currentVersionId={currentVersionId}
        versions={versions}
        open={historyOpen}
        onOpenChange={onHistoryOpenChange}
      />
    </aside>
  );
}

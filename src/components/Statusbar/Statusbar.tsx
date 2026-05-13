'use client';

import styles from './Statusbar.module.css';

interface StatusbarProps {
  projectName?: string;
  itemCount?: number;
  folderCount?: number;
}

export function Statusbar({ projectName, itemCount = 0, folderCount = 0 }: StatusbarProps) {
  return (
    <div className={styles.bar}>
      {projectName && <span className={styles.projectName}>{projectName}</span>}
      <span className={styles.segment}>
        {itemCount} mockup{itemCount !== 1 ? 's' : ''}
      </span>
      {folderCount > 0 && (
        <span className={styles.segment}>
          {folderCount} pasta{folderCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

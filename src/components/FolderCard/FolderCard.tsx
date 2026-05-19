import Link from 'next/link';
import { folderHref } from '@/lib/project/routes';
import styles from './FolderCard.module.css';

interface FolderCardProps {
  folder: {
    id: string;
    name: string;
    childCount: number;
  };
  projectSlug: string;
  /** Ancestor folder names + this folder's name — used to build the
   *  path-based folder URL. */
  folderPath: ReadonlyArray<string>;
}

export function FolderCard({ folder, projectSlug, folderPath }: FolderCardProps) {
  return (
    <Link href={folderHref(projectSlug, folderPath)} className={styles.card}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={styles.icon}
      >
        <path
          d="M2 4a1 1 0 011-1h3.5l1.5 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
      <div className={styles.info}>
        <div className={styles.name}>{folder.name}</div>
        <div className={styles.meta}>
          {folder.childCount} {folder.childCount === 1 ? 'item' : 'itens'}
        </div>
      </div>
    </Link>
  );
}

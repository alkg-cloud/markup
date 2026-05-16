import styles from "./FolderToolbar.module.css";

interface Props {
  onNewMockup: () => void;
  onNewFolder: () => void;
}

export function FolderToolbar({ onNewMockup, onNewFolder }: Props) {
  return (
    <div className={styles.toolbar}>
      <button type="button" className={styles.primary} onClick={onNewMockup}>
        + New Mockup
      </button>
      <button type="button" className={styles.secondary} onClick={onNewFolder}>
        New Folder
      </button>
    </div>
  );
}

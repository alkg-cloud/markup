import styles from "./MockupToolbar.module.css";

export interface MockupToolbarProps {
  zoom: number;
  versionLabel: string;
  mode: "edit" | "comment";
  onModeChange: (mode: "edit" | "comment") => void;
  onZoomChange: (delta: number | "reset") => void;
  onFullscreen: () => void;
  onHistory: () => void;
  onDiff: () => void;
}

export function MockupToolbar({
  zoom, versionLabel, mode,
  onModeChange, onZoomChange, onFullscreen, onHistory, onDiff,
}: MockupToolbarProps) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Mockup actions">
      <button type="button" aria-label="Edit mode" aria-pressed={mode === "edit"}
        onClick={() => onModeChange("edit")} className={styles.iconBtn}>✏️</button>
      <button type="button" aria-label="Comment mode" aria-pressed={mode === "comment"}
        onClick={() => onModeChange("comment")} className={styles.iconBtn}>💬</button>
      <span className={styles.divider} aria-hidden="true" />
      <button type="button" aria-label="Zoom out" onClick={() => onZoomChange(-10)}
        className={styles.iconBtn}>−</button>
      <span className={styles.zoomLabel}>{zoom}%</span>
      <button type="button" aria-label="Zoom in" onClick={() => onZoomChange(10)}
        className={styles.iconBtn}>+</button>
      <button type="button" aria-label="Fullscreen" onClick={onFullscreen}
        className={styles.iconBtn}>⛶</button>
      <span className={styles.divider} aria-hidden="true" />
      <button type="button" aria-label="History" onClick={onHistory}
        className={styles.iconBtn}>🔄</button>
      <span className={styles.versionPill}>{versionLabel}</span>
      <button type="button" aria-label="View diff" onClick={onDiff}
        className={styles.iconBtn}>📑</button>
    </div>
  );
}

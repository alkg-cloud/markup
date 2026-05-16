import {
  VscAdd,
  VscChevronDown,
  VscComment,
  VscDiff,
  VscEdit,
  VscHistory,
  VscRemove,
  VscScreenFull,
} from 'react-icons/vsc';
import styles from './MockupToolbar.module.css';

export interface MockupToolbarProps {
  zoom: number;
  versionLabel: string;
  mode: 'edit' | 'comment';
  onModeChange: (mode: 'edit' | 'comment') => void;
  onZoomChange: (delta: number | 'reset') => void;
  onFullscreen: () => void;
  onHistory: () => void;
  onDiff: () => void;
}

export function MockupToolbar({
  zoom,
  versionLabel,
  mode,
  onModeChange,
  onZoomChange,
  onFullscreen,
  onHistory,
  onDiff,
}: MockupToolbarProps) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Mockup actions">
      <button
        type="button"
        aria-label="Edit mode"
        aria-pressed={mode === 'edit'}
        onClick={() => onModeChange('edit')}
        className={styles.iconBtn}
      >
        <VscEdit aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Comment mode"
        aria-pressed={mode === 'comment'}
        onClick={() => onModeChange('comment')}
        className={styles.iconBtn}
      >
        <VscComment aria-hidden="true" />
      </button>
      <span className={styles.divider} aria-hidden="true" />
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => onZoomChange(-10)}
        className={styles.iconBtn}
      >
        <VscRemove aria-hidden="true" />
      </button>
      <span className={styles.zoomLabel}>{zoom}%</span>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => onZoomChange(10)}
        className={styles.iconBtn}
      >
        <VscAdd aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Fullscreen"
        onClick={onFullscreen}
        className={styles.iconBtn}
      >
        <VscScreenFull aria-hidden="true" />
      </button>
      <span className={styles.divider} aria-hidden="true" />
      <button type="button" aria-label="History" onClick={onHistory} className={styles.iconBtn}>
        <VscHistory aria-hidden="true" />
      </button>
      <span className={styles.versionPill}>
        {versionLabel} <VscChevronDown aria-hidden="true" />
      </span>
      <button type="button" aria-label="View diff" onClick={onDiff} className={styles.iconBtn}>
        <VscDiff aria-hidden="true" />
      </button>
    </div>
  );
}

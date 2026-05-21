import { resolveIconToken } from '@/components/IconPicker/icons';
import styles from './FolderHeader.module.css';

interface Props {
  /** Icon token such as "emoji:🎨" or "vsc:VscFile". Pass null/undefined to hide the icon. */
  icon?: string | null;
  name: string;
  count: number;
}

function IconDisplay({ token }: { token: string }) {
  const resolved = resolveIconToken(token);
  if (!resolved) return <span aria-hidden="true">{token}</span>;
  if (resolved.kind === 'emoji') return <span aria-hidden="true">{resolved.glyph}</span>;
  const { Icon } = resolved;
  return <Icon aria-hidden="true" />;
}

export function FolderHeader({ icon, name, count }: Props) {
  return (
    <header className={styles.header}>
      {icon && (
        <span className={styles.icon}>
          <IconDisplay token={icon} />
        </span>
      )}
      <h1 className={styles.name}>{name}</h1>
      <span className={styles.count}>
        {count} {count === 1 ? 'item' : 'items'}
      </span>
    </header>
  );
}

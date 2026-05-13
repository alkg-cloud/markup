'use client';

import { type ReactNode, type RefObject, useCallback, useEffect, useRef } from 'react';
import styles from './Dropdown.module.css';

interface DropdownProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  align?: 'left' | 'right';
  children: ReactNode;
}

export function Dropdown({ open, onClose, anchorRef, align = 'left', children }: DropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    },
    [onClose, anchorRef],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, handleKeyDown, handleClickOutside]);

  const classNames = [
    styles.menu,
    open ? styles.menuOpen : '',
    align === 'right' ? styles.alignRight : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={menuRef} className={classNames} role="menu">
      {children}
    </div>
  );
}

interface DropdownItemProps {
  icon?: ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}

export function DropdownItem({ icon, label, danger, onClick }: DropdownItemProps) {
  return (
    <button
      type="button"
      className={[styles.item, danger ? styles.itemDanger : ''].filter(Boolean).join(' ')}
      role="menuitem"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

export function DropdownDivider() {
  return <div className={styles.divider} />;
}

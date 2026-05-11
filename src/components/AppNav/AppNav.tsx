'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  /** Match if the current pathname starts with this prefix. */
  matchPrefix?: string;
}

const ITEMS: NavItem[] = [
  { href: '/projects', label: 'Projetos', matchPrefix: '/projects' },
  { href: '/mockups', label: 'Mockups', matchPrefix: '/mockups' },
  { href: '/settings/agents', label: 'Agents', matchPrefix: '/settings/agents' },
];

/**
 * AppNav — a small navlink strip rendered above /mockups and /settings/agents.
 * Lets the user move between top-level views without relying on the back-link.
 *
 * Each link is a client navlink because :hover state on inline-styled Links
 * can't be expressed without local state.
 */
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const color = active ? 'var(--accent)' : hovered ? 'var(--text-bright)' : 'var(--text-dim)';
  const bg = active ? 'transparent' : hovered ? 'var(--surface-hover)' : 'transparent';
  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 'var(--type-sm)',
        fontWeight: 'var(--weight-semibold)',
        color,
        background: bg,
        padding: '5px 10px',
        borderRadius: 'var(--radius-pill)',
        textDecoration: 'none',
        letterSpacing: '0.005em',
        transition:
          'color var(--motion-fast) var(--ease-standard), background var(--motion-fast) var(--ease-standard), transform var(--motion-instant) var(--ease-standard)',
        transform: pressed ? 'translateY(1px)' : 'translateY(0)',
      }}
    >
      {item.label}
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav
      aria-label="Primary"
      style={{
        display: 'inline-flex',
        gap: 'var(--space-md)',
        alignItems: 'center',
      }}
    >
      {ITEMS.map((item) => {
        const active = item.matchPrefix
          ? pathname.startsWith(item.matchPrefix)
          : pathname === item.href;
        return <NavLink key={item.href} item={item} active={active} />;
      })}
    </nav>
  );
}

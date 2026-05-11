'use client';

import { useState } from 'react';

interface EmptyStateProps {
  variant: 'project' | 'folder';
  onUpload?: () => void;
  onCreateFolder?: () => void;
}

export function EmptyState({ variant, onUpload, onCreateFolder }: EmptyStateProps) {
  const title = 'Nenhum mockup ainda';
  const subtitle =
    variant === 'project'
      ? 'Crie uma pasta para organizar ou faça upload do primeiro mockup.'
      : 'Crie uma subpasta ou faça upload de um mockup.';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-2xl)',
        gap: 'var(--space-xl)',
        minHeight: 400,
        textAlign: 'center',
      }}
    >
      {/* Illustration */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        aria-hidden="true"
        style={{ opacity: 0.4 }}
      >
        <rect
          x="12"
          y="20"
          width="56"
          height="40"
          rx="6"
          stroke="var(--border-strong)"
          strokeWidth="2"
        />
        <rect x="8" y="15" width="56" height="40" rx="6" stroke="var(--border)" strokeWidth="1.5" />
        <rect
          x="4"
          y="10"
          width="56"
          height="40"
          rx="6"
          stroke="var(--border-subtle)"
          strokeWidth="1"
        />
        <rect x="20" y="32" width="20" height="2.5" rx="1.25" fill="var(--border-strong)" />
        <rect x="20" y="39" width="32" height="2.5" rx="1.25" fill="var(--border)" />
        <rect x="20" y="46" width="26" height="2.5" rx="1.25" fill="var(--border)" />
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        <h2
          style={{
            fontSize: 'var(--type-md)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--text-bright)',
            margin: 0,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 'var(--type-sm)',
            color: 'var(--text-muted)',
            maxWidth: 320,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        {onUpload && <EmptyStateButton label="Fazer upload de mockup" primary onClick={onUpload} />}
        {onCreateFolder && <EmptyStateButton label="Criar pasta" onClick={onCreateFolder} />}
      </div>
    </div>
  );
}

function EmptyStateButton({
  label,
  primary,
  onClick,
}: {
  label: string;
  primary?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        padding: '6px var(--space-sm)',
        borderRadius: 'var(--radius-xs)',
        fontSize: 'var(--type-sm)',
        fontWeight: 'var(--weight-medium)',
        border: 'none',
        cursor: 'pointer',
        transition: 'background var(--motion-fast) var(--ease-standard)',
        ...(primary
          ? {
              background: hovered ? 'var(--accent-bright)' : 'var(--accent)',
              color: 'var(--text-on-accent)',
              fontWeight: 'var(--weight-semibold)',
            }
          : {
              background: hovered ? 'var(--btn-bg-hover)' : 'var(--btn-bg)',
              color: 'var(--text-dim)',
            }),
      }}
    >
      {label}
    </button>
  );
}

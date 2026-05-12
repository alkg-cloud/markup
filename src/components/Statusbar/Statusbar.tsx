'use client';

interface StatusbarProps {
  projectName?: string;
  itemCount?: number;
  folderCount?: number;
}

export function Statusbar({ projectName, itemCount = 0, folderCount = 0 }: StatusbarProps) {
  return (
    <div
      style={{
        height: 24,
        background: 'var(--accent-soft)',
        borderTop: '1px solid var(--accent-overlay-soft)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--space-md)',
        gap: 'var(--space-md)',
        flexShrink: 0,
      }}
    >
      {projectName && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 'var(--type-xs)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent)',
          }}
        >
          {projectName}
        </span>
      )}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 'var(--type-xs)',
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent-dim)',
        }}
      >
        {itemCount} mockup{itemCount !== 1 ? 's' : ''}
      </span>
      {folderCount > 0 && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 'var(--type-xs)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-dim)',
          }}
        >
          {folderCount} pasta{folderCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';

/* ── Deterministic hue from slug ─────────────────────────────────────────── */
const HUE_PALETTE = [80, 25, 200, 165, 322, 270];

function slugHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function hueForSlug(slug: string): number {
  return HUE_PALETTE[slugHash(slug) % HUE_PALETTE.length];
}

/* ── Relative time helper ─────────────────────────────────────────────────── */
function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

/* ── Status pill config ───────────────────────────────────────────────────── */
type PillVariant = 'pill-info' | 'pill-success' | 'pill-mute';

const STATUS_CONFIG: Record<string, { variant: PillVariant; label: string }> = {
  open: { variant: 'pill-info', label: 'Open' },
  resolved: { variant: 'pill-success', label: 'Resolved' },
  archived: { variant: 'pill-mute', label: 'Archived' },
};

const PILL_STYLES: Record<PillVariant, React.CSSProperties> = {
  'pill-info': { background: 'var(--info-soft)', color: 'var(--info)' },
  'pill-success': { background: 'var(--success-soft)', color: 'var(--success)' },
  'pill-mute': { background: 'rgba(120, 120, 130, 0.15)', color: 'var(--text-dim)' },
};

interface MockupCardProps {
  id: string;
  name: string;
  slug: string;
  status: string;
  updatedAt: string; // ISO string (serialized from server)
}

export default function MockupCard({ id, name, slug, status, updatedAt }: MockupCardProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [imgError, setImgError] = useState(false);

  const hue = hueForSlug(slug);
  const monogram = name.trim().slice(0, 2).toUpperCase();
  const pill = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  const pillVariantStyle = PILL_STYLES[pill.variant];

  /* Active state shows a slight settle (less lift than hover) */
  const translateY = pressed ? '-1px' : hovered ? '-3px' : '0';
  const cardStyle: React.CSSProperties = {
    background:
      'linear-gradient(135.92deg, oklch(20% 0.025 322 / 0.85) 7%, oklch(15% 0.02 322 / 0.85) 98%)',
    border: `1px solid ${hovered ? 'oklch(74.4% 0.193 165 / 0.4)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-card)',
    overflow: 'visible',
    transition: `transform var(--motion-base) var(--ease-emphasized), border-color var(--motion-base) var(--ease-emphasized), box-shadow var(--motion-base) var(--ease-emphasized)`,
    transform: `translateY(${translateY})`,
    boxShadow: hovered ? 'var(--shadow-md)' : 'none',
    display: 'block',
    color: 'inherit',
    textDecoration: 'none',
  };

  /* Monogram thumb: radial gradient from the slug-derived hue */
  const thumbBg = `radial-gradient(ellipse at 25% 35%, oklch(38% 0.16 ${hue} / 0.55), transparent 65%), oklch(20% 0.03 165)`;

  return (
    <Link
      href={`/mockups/${id}`}
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
    >
      {/* ── Thumbnail / monogram fallback ───────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '16 / 10',
          overflow: 'hidden',
          borderRadius: 'var(--radius-card) var(--radius-card) 0 0',
        }}
      >
        {/* Monogram layer — always present, covered by img when available */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: thumbBg,
            fontFamily: 'var(--font-display)',
            fontSize: '64px',
            fontWeight: 'var(--weight-extra)',
            letterSpacing: 'var(--tracking-tighter)',
            color: 'var(--accent)',
            userSelect: 'none',
          }}
        >
          {/* depth overlay ::after emulated inline via second absolute div */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 50% 30%, transparent 30%, oklch(0% 0 0 / 0.5))',
              pointerEvents: 'none',
            }}
          />
          <span style={{ position: 'relative', zIndex: 1 }}>{monogram}</span>
        </div>

        {/* Actual thumbnail — covers monogram when available.
         * Z-index 2 wins over the monogram's inner <span> which is zIndex 1
         * (it has to ride above the depth overlay). Without this the
         * monogram letters stayed visible on top of the screenshot. */}
        {!imgError && (
          <img
            src={`/api/mockups/${id}/thumbnail`}
            alt=""
            onError={() => setImgError(true)}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              display: 'block',
            }}
          />
        )}
      </div>

      {/* ── Meta row ────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: 'var(--space-md) var(--space-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}
      >
        {/* Left: title + subtitle */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--type-md)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--text-bright)',
              letterSpacing: 'var(--tracking-tight)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </div>
          <div
            className="tnum"
            style={{
              fontSize: 'var(--type-xs)',
              color: 'var(--text-dim)',
              marginTop: 2,
              fontFeatureSettings: "'tnum'",
            }}
          >
            Updated {relativeTime(new Date(updatedAt))}
          </div>
        </div>

        {/* Right: status pill */}
        <span
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 'var(--type-2xs)',
            fontWeight: 'var(--weight-bold)',
            letterSpacing: 'var(--tracking-wide)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
            textTransform: 'uppercase',
            ...pillVariantStyle,
          }}
        >
          {/* dot */}
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'currentColor',
              marginRight: 2,
              flexShrink: 0,
            }}
          />
          {pill.label}
        </span>
      </div>
    </Link>
  );
}

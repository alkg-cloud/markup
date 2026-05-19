'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './MockupCard.module.css';

const HUE_PALETTE = [80, 25, 200, 165, 322, 270];

function slugHash(slug: string): number {
  const h = [...slug].reduce((acc, c) => (Math.imul(31, acc) + c.charCodeAt(0)) | 0, 0);
  return Math.abs(h);
}

function hueForSlug(slug: string): number {
  return HUE_PALETTE[slugHash(slug) % HUE_PALETTE.length];
}

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

interface MockupCardProps {
  id: string;
  name: string;
  slug: string;
  status: string;
  updatedAt: string;
  /** Pre-computed canonical URL — parent builds this from the project
   *  slug + folder path + mockup slug so the card doesn't need to walk
   *  the tree itself. */
  href: string;
}

export default function MockupCard({ id, name, slug, status, updatedAt, href }: MockupCardProps) {
  const [imgError, setImgError] = useState(false);

  const hue = hueForSlug(slug);
  const monogram = name.trim().slice(0, 2).toUpperCase();

  const thumbBg = `radial-gradient(ellipse at 25% 35%, oklch(38% 0.16 ${hue} / 0.55), transparent 65%), var(--bg-card-active)`;

  return (
    <Link href={href} className={styles.card}>
      <div className={styles.thumb}>
        <div className={styles.monogram} aria-hidden="true" style={{ background: thumbBg }}>
          {monogram}
        </div>

        {!imgError && (
          <img
            src={`/api/mockups/${id}/thumbnail`}
            alt=""
            onError={() => setImgError(true)}
            className={styles.thumbnailImg}
          />
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.name}>{name}</div>
        <div className={styles.meta}>Updated {relativeTime(new Date(updatedAt))}</div>

        {status === 'open' && <div className={`${styles.badge} ${styles.badgeWarning}`}>Open</div>}
        {status === 'resolved' && (
          <div className={`${styles.badge} ${styles.badgeSuccess}`}>Resolved</div>
        )}
      </div>
    </Link>
  );
}

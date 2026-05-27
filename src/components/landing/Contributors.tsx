'use client';

import { useEffect, useState } from 'react';
import { type ContributorLike, isBotOrAI } from './Contributors.filters';
import styles from './Contributors.module.css';
import { PillLink } from './primitives/PillButton';
import { Section } from './primitives/Section';

const REPO = 'alkg-cloud/markup';
const MIN_REAL = 3;
const MAX_VISIBLE = 4;
const CACHE_KEY = 'markup-landing:contributors:v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const GITHUB_URL = `https://github.com/${REPO}`;
const CONTRIBUTING_URL = `${GITHUB_URL}/blob/main/CONTRIBUTING.md`;

type Contributor = ContributorLike & {
  avatar_url: string;
  contributions: number;
};

type CacheShape = { ts: number; items: Contributor[] };

function readCache(): Contributor[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CacheShape;
    if (Date.now() - c.ts > CACHE_TTL_MS) return null;
    return c.items;
  } catch {
    return null;
  }
}

function writeCache(items: Contributor[]) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }));
  } catch {
    // quota errors / private mode — silent
  }
}

export function Contributors() {
  const [items, setItems] = useState<Contributor[] | null>(() => readCache());

  useEffect(() => {
    if (items) return; // cache hit — skip the network
    let cancelled = false;
    fetch(`https://api.github.com/repos/${REPO}/contributors?per_page=30`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`GH ${r.status}`))))
      .then((list: Contributor[]) => {
        if (cancelled) return;
        if (!Array.isArray(list)) return;
        const real = list.filter((c) => !isBotOrAI(c));
        if (real.length < MIN_REAL) return;
        writeCache(real);
        setItems(real);
      })
      .catch(() => {
        // silent: section stays hidden
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = items?.slice(0, MAX_VISIBLE) ?? [];
  const extra = items ? items.length - visible.length : 0;
  const shouldShow = items !== null && items.length >= MIN_REAL;

  return (
    <Section
      width="narrow"
      className={
        shouldShow ? `${styles.section} ${styles.hasContributors} has-contributors` : styles.section
      }
    >
      <div className={styles.card}>
        <div className={styles.avatars}>
          {visible.map((c) => (
            <a
              key={c.login}
              href={`https://github.com/${c.login}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={`${c.avatar_url}&s=80`}
                alt={c.login}
                title={`${c.login} · ${c.contributions} contributions`}
                loading="lazy"
                width={40}
                height={40}
              />
            </a>
          ))}
          {extra > 0 && <span title={`${extra} more`}>+{extra}</span>}
        </div>
        <div className={styles.body}>
          <h3>Open source, made better by contributors.</h3>
          <p>
            Markup is built in the open. Bug reports, feature PRs, and design feedback all land on
            the same issue tracker. Become a contributor in one PR.
          </p>
          <div className={styles.cta}>
            <PillLink variant="primary" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              Open the repo →
            </PillLink>
            <PillLink
              variant="ghost"
              href={CONTRIBUTING_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read CONTRIBUTING.md
            </PillLink>
          </div>
        </div>
      </div>
    </Section>
  );
}

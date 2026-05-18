'use client';
import type { MouseEvent } from 'react';
import styles from './ReactionPill.module.css';

export interface ReactionPillProps {
  emoji: string;
  /** List of display names who reacted with this emoji. Drives tooltip + count. */
  reactedBy: string[];
  /** Whether the current user is in the reactedBy list — toggles the `.reacted` class. */
  isCurrentUser: boolean;
  /** Called when the pill is clicked — caller toggles the current user. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Reaction pill — Slack-style emoji badge with optional count + hover
 * tooltip listing reactors. Count is only shown when `reactedBy.length > 1`.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §10.
 */
export function ReactionPill({ emoji, reactedBy, isCurrentUser, onClick }: ReactionPillProps) {
  const count = reactedBy.length;
  const tooltip = formatReactorList(reactedBy, emoji);
  return (
    <button
      type="button"
      className={[styles.pill, isCurrentUser && styles.reacted].filter(Boolean).join(' ')}
      data-tooltip={tooltip}
      data-emoji={emoji}
      aria-label={tooltip}
      onClick={onClick}
    >
      <span className={styles.emoji}>{emoji}</span>
      {count > 1 ? <span className={styles.count}>{count}</span> : null}
    </button>
  );
}

/**
 * Format a reactor list for the hover tooltip. Single → "X reacted with E".
 * Two → "X and Y reacted with E". 3+ → "X, Y and Z reacted with E".
 */
export function formatReactorList(users: string[], emoji: string): string {
  if (users.length === 0) return '';
  if (users.length === 1) return `${users[0]} reacted with ${emoji}`;
  if (users.length === 2) return `${users[0]} and ${users[1]} reacted with ${emoji}`;
  const head = users.slice(0, -1).join(', ');
  const tail = users[users.length - 1];
  return `${head} and ${tail} reacted with ${emoji}`;
}

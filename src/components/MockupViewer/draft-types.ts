import type { AnchorRecord } from '@/lib/annotation/service';

export type DraftStatus = 'unsaved' | 'saving' | 'saved' | 'sending' | 'error';
export type BodyState = 'empty' | 'typing' | 'over-limit';
export type PinCount = 'zero' | 'some' | 'max';

export interface Draft {
  body: string;
  pins: AnchorRecord[];
  lastSavedAt: number | null;
  hasUnsavedChanges: boolean;
}

export type DraftState = Draft | null;

export interface StoredDraft {
  body: string;
  pins: AnchorRecord[];
  lastSavedAt: number;
  schemaVersion: 1;
}

export const BODY_CHAR_LIMIT = 10_000;
export const MAX_PINS = 20;
export const STALE_DRAFT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const DRAFT_DEBOUNCE_MS = 800;
export const STORAGE_SCHEMA_VERSION = 1 as const;

export function storageKey(mockupId: string, userId: string): string {
  return `markup:draft:${mockupId}:${userId}`;
}

export function deriveBodyState(body: string): BodyState {
  if (body.length === 0) return 'empty';
  if (body.length > BODY_CHAR_LIMIT) return 'over-limit';
  return 'typing';
}

export function derivePinCount(n: number): PinCount {
  if (n === 0) return 'zero';
  if (n >= MAX_PINS) return 'max';
  return 'some';
}

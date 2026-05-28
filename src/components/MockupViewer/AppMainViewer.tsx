'use client';
/**
 * AppMainViewer — thin pass-through that delegates to `AppMainShell`.
 *
 * The version/historic orchestration that used to live here moved into
 * `AppMainShell` so the bare `ViewerShell` can stay portable to the
 * landing-page demo. This file keeps the same public API (`AppMainAnnotation`
 * type, `AppMainViewerProps`, `AppMainViewer` component) so
 * `AppMainViewerWired` and the rest of the codebase do not have to shift
 * imports during the shell extraction.
 *
 * See `docs/superpowers/specs/2026-05-28-tldraw-removal-and-viewer-shell-design.md`
 * for the layering rationale.
 */
import type { AnnotationStatus, ThreadComment } from '@/components/AnnotationCard';
import type { VersionRow } from '@/components/VersionChip';
import type { Anchor } from '@/lib/anchoring';
import { AppMainShell } from './AppMainShell';

export interface AppMainAnnotation {
  id: string;
  /** Thread id — used by wired wrappers for reply posts. Optional so
   *  tests can stub annotations without a thread. */
  threadId?: string;
  colorIndex: number;
  label: number;
  status: AnnotationStatus;
  author: string;
  authorColorIndex: number;
  date: string;
  primary: ThreadComment;
  replies?: ThreadComment[];
  anchors: Anchor[];
}

export interface AppMainViewerProps {
  /** Stable identifier for this mockup. Drives the `localStorage` key
   *  for the draft persistence hook (`markup:draft:<mockupId>:<userId>`). */
  mockupId?: string;
  mockupSrc: string;
  currentUser: string;
  versions: VersionRow[];
  initialAnnotations: AppMainAnnotation[];

  onCreateAnnotation?: (input: {
    body: string;
    anchors: Anchor[];
    colorIndex: number;
  }) => Promise<AppMainAnnotation | null>;
  onPostReply?: (annotationId: string, body: string) => Promise<ThreadComment | null>;
  onReactionToggle?: (commentId: string, emoji: string) => Promise<void>;
  /** Persist an edited comment body. Receives the new body string from
   *  the inline edit UI; returns true on success so callers can apply
   *  the optimistic local update + dismiss the editor. */
  onCommentEdit?: (commentId: string, newBody: string) => Promise<boolean>;
  /** Delete a comment. Returns true on success. */
  onCommentDelete?: (commentId: string) => Promise<boolean>;
  /** Change an annotation's status. Returns true on success. */
  onAnnotationStatusChange?: (annotationId: string, status: AnnotationStatus) => Promise<boolean>;
  /** Delete an annotation (cascades thread + messages + reactions). */
  onAnnotationDelete?: (annotationId: string) => Promise<boolean>;
  onVersionSelect?: (versionId: string) => void;
  onVersionPromote?: (versionId: string) => void;
  onVersionDelete?: (versionId: string) => void;
  /** Whether the current viewer is an admin — widens delete access on annotations/comments. */
  viewerIsAdmin?: boolean;
  /** Current (latest / promoted) version id — used to compute `isHistoric`. */
  currentVid?: string;
  /** Viewed version id from the URL (`?v=<vid>`). When set AND different
   *  from `currentVid` AND present in `versions[]`, the viewer enters
   *  historic mode: iframe loads `?v=<vid>`, rail + cards go read-only,
   *  draft disabled, `HistoricBanner` mounted. */
  viewingVid?: string | null;
  /** Called when the user clicks "Back to current" in the banner. Parent
   *  owns `router.replace` so the page can decide on canonicalization rules. */
  onExitHistoric?: () => void;
  /** Called when `viewingVid` is non-null but does not match any row in
   *  `versions[]`. Parent should `router.replace(pathname)` + toast a
   *  "version not found" message. */
  onInvalidViewingVid?: () => void;
}

export function AppMainViewer(props: AppMainViewerProps) {
  return <AppMainShell {...props} />;
}

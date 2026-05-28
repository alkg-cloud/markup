'use client';
/**
 * AppMainViewer — production wrapper around `ViewerShell` that owns
 * version-aware concerns (historic mode detection, mockup-URL composition
 * with `?v=<vid>`, invalid-vid notification) and renders the prod-only
 * HistoricBanner / VersionChip via the shell's render-prop slots.
 *
 * The bare canvas + rail + draft + pin composition lives in
 * `ViewerShell.tsx`. Keep this file focused on prod-only orchestration so
 * the shell stays portable to the landing-page demo.
 */
import { useMemo } from 'react';
import type { AnnotationStatus, ThreadComment } from '@/components/AnnotationCard';
import { AppMain } from '@/components/AppMain/AppMain';
import { HistoricBanner } from '@/components/HistoricBanner';
import { useToast } from '@/components/Toast/useToast';
import { VersionChip, type VersionRow } from '@/components/VersionChip';
import type { Anchor } from '@/lib/anchoring';
import { setQuery } from '@/lib/url/append-query';
import { useInvalidViewingVidNotifier } from './useInvalidViewingVidNotifier';
import { ViewerShell, type ViewerShellProps } from './ViewerShell';

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

export function AppMainViewer({
  mockupId = 'unknown',
  mockupSrc,
  currentUser,
  versions,
  initialAnnotations,
  onCreateAnnotation,
  onPostReply,
  onReactionToggle,
  onCommentEdit,
  onCommentDelete,
  onAnnotationStatusChange,
  onAnnotationDelete,
  onVersionSelect,
  onVersionPromote,
  onVersionDelete,
  viewerIsAdmin = false,
  currentVid,
  viewingVid,
  onExitHistoric,
  onInvalidViewingVid,
}: AppMainViewerProps) {
  const toastApi = useToast();

  const isViewingKnown = useMemo(
    () => !!viewingVid && versions.some((v) => v.id === viewingVid),
    [viewingVid, versions],
  );
  const isHistoric = isViewingKnown && viewingVid !== currentVid;

  // `mockupSrc` from the viewer payload already carries `?v=<currentVid>` as a
  // cache-buster. Use `setQuery` (not `appendQuery`) so historic mode REPLACES
  // the existing `v` param instead of producing a duplicate that the serve
  // route's `searchParams.get('v')` would silently resolve to the first
  // occurrence (i.e. the current vid).
  const resolvedMockupSrc = useMemo<ViewerShellProps['mockupSrc']>(
    () => ({
      kind: 'src',
      url: isHistoric && viewingVid != null ? setQuery(mockupSrc, 'v', viewingVid) : mockupSrc,
    }),
    [mockupSrc, isHistoric, viewingVid],
  );

  useInvalidViewingVidNotifier({ viewingVid, isViewingKnown, onInvalidViewingVid });

  const viewingLabel = isHistoric ? (versions.find((v) => v.id === viewingVid)?.label ?? '') : '';
  const currentLabel = isHistoric ? (versions.find((v) => v.id === currentVid)?.label ?? '') : '';

  const toastBridge = useMemo<ViewerShellProps['toast']>(
    () => (message: string) => {
      toastApi.show(message);
    },
    [toastApi],
  );

  return (
    <AppMain variant="viewer" ariaLabel="Mockup viewer">
      <ViewerShell
        scopeId={mockupId}
        userId={currentUser}
        mockupSrc={resolvedMockupSrc}
        annotations={initialAnnotations}
        onCreateAnnotation={onCreateAnnotation}
        onPostReply={onPostReply}
        onReactionToggle={onReactionToggle}
        onCommentEdit={onCommentEdit}
        onCommentDelete={onCommentDelete}
        onAnnotationStatusChange={onAnnotationStatusChange}
        onAnnotationDelete={onAnnotationDelete}
        viewerIsAdmin={viewerIsAdmin}
        toast={toastBridge}
        renderHistoricBanner={
          isHistoric
            ? () => (
                <HistoricBanner
                  viewingLabel={viewingLabel}
                  currentLabel={currentLabel}
                  onExit={() => onExitHistoric?.()}
                />
              )
            : undefined
        }
        renderToolbarChip={() => (
          <VersionChip
            versions={versions}
            onSelect={onVersionSelect}
            onPromote={onVersionPromote}
            onDelete={onVersionDelete}
          />
        )}
      />
    </AppMain>
  );
}

'use client';
/**
 * AppMainShell — production wrapper around `ViewerShell` that owns
 * version-aware concerns (historic mode detection, mockup-URL composition
 * with `?v=<vid>`, invalid-vid notification) and renders the prod-only
 * HistoricBanner / VersionChip via the shell's render-prop slots.
 *
 * `AppMainViewer` is a thin pass-through around this component that
 * preserves the historical public API consumed by `AppMainViewerWired`.
 * Keep version/historic orchestration here so `ViewerShell` stays portable
 * to the landing-page demo (which never needs versions or historic mode).
 */
import { useMemo } from 'react';
import { AppMain } from '@/components/AppMain/AppMain';
import { HistoricBanner } from '@/components/HistoricBanner';
import { useToast } from '@/components/Toast/useToast';
import { VersionChip } from '@/components/VersionChip';
import { setQuery } from '@/lib/url/append-query';
import type { AppMainViewerProps } from './AppMainViewer';
import { useInvalidViewingVidNotifier } from './useInvalidViewingVidNotifier';
import { ViewerShell, type ViewerShellProps } from './ViewerShell';

/**
 * `AppMainShell` keeps the same prop shape as `AppMainViewer` so the public
 * API consumed by `AppMainViewerWired` does not shift when callers move from
 * the pass-through to the shell directly. The spec sketches an alternate
 * shape with `mockupBaseUrl` + explicit `VersionDescriptor[]`; we deliberately
 * defer that rename to a follow-up so this refactor stays mechanical.
 */
export type AppMainShellProps = AppMainViewerProps;

export function AppMainShell({
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
}: AppMainShellProps) {
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

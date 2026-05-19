'use client';
/**
 * AppMainViewer — composition of the redesigned floating-cockpit viewer.
 *
 * Per `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md`.
 * The mockup loads in a same-origin iframe; the canvas root is set to
 * the iframe document's <html> after load. PinLayer + click capture
 * cross the boundary via the cross-document anchoring runtime
 * (`docs/superpowers/specs/2026-05-18-pin-anchoring-strategy.md`).
 *
 * State and effects are split across focused hooks:
 *   - `useAppMainAnnotations` — annotation list + reply/edit/delete/react
 *   - `useViewerCanvas`        — iframe wiring + in-iframe click capture
 *   - `useViewerFullscreen`    — fullscreen toggle + state mirror
 * and a memoized `ViewerCanvas` sub-component holds the iframe + PinLayer
 * so composer/rail churn doesn't reload the mockup.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AnnotationCard,
  type AnnotationStatus,
  type ThreadComment,
} from '@/components/AnnotationCard';
import { AnnotationComposer } from '@/components/AnnotationComposer';
import { AnnotationsRail, type AnnotationsRailBadge } from '@/components/AnnotationsRail';
import { AppMain } from '@/components/AppMain/AppMain';
import { CanvasToolbar } from '@/components/CanvasToolbar';
import { MarkingBar } from '@/components/MarkingBar';
import type { PinDescriptor } from '@/components/PinLayer';
import { VersionChip, type VersionRow } from '@/components/VersionChip';
import type { Anchor } from '@/lib/anchoring';
import { useAppMainAnnotations } from './useAppMainAnnotations';
import { useViewerCanvas } from './useViewerCanvas';
import { useViewerFullscreen } from './useViewerFullscreen';
import { ViewerCanvas } from './ViewerCanvas';

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
}

export function AppMainViewer({
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
}: AppMainViewerProps) {
  const appMainRef = useRef<HTMLDivElement | null>(null);

  const {
    annotations,
    nextColorIndex,
    postReply,
    editComment,
    deleteComment,
    toggleReaction,
    changeStatus,
    deleteAnnotation,
    prependCreated,
  } = useAppMainAnnotations({
    initialAnnotations,
    currentUser,
    onPostReply,
    onReactionToggle,
    onCommentEdit,
    onCommentDelete,
    onAnnotationStatusChange,
    onAnnotationDelete,
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  // Accordion: only one thread expanded at a time so the rail stays
  // skimmable. Opening a thread on card B collapses card A's thread.
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const onThreadToggle = useCallback((annotationId: string) => {
    setOpenThreadId((cur) => (cur === annotationId ? null : annotationId));
  }, []);
  const [composerOpen, setComposerOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  // Pending pins use a stable client id keyed by creation so an index
  // shuffle (remove pin 2 of 4) doesn't shift React keys onto a different
  // anchor's identity.
  const [pendingPins, setPendingPins] = useState<{ id: string; anchor: Anchor }[]>([]);
  const [zoom, setZoom] = useState(1);
  // Bumped each time the user clicks a canvas pin so the rail pins
  // itself open. Decoupling the trigger from `activeId` lets the rail
  // stay collapsed when the active annotation changes from the rail
  // itself (e.g. accordion thread toggle). Starts `undefined` so the
  // rail's expand-signal effect skips the initial commit and the rail
  // only pins after a real pin-click.
  const [railExpandSignal, setRailExpandSignal] = useState<number | undefined>(undefined);

  const onPinFromIframe = useCallback((anchor: Anchor) => {
    setPendingPins((p) => [
      ...p,
      { id: `pp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, anchor },
    ]);
  }, []);
  const onMissFromIframe = useCallback(() => setActiveId(null), []);

  const { iframeRef, canvasRootRef, iframeGen } = useViewerCanvas({
    marking,
    onPin: onPinFromIframe,
    onMiss: onMissFromIframe,
  });

  const { isFullscreen, toggle: onFullscreenToggle } = useViewerFullscreen(appMainRef);

  const badges: AnnotationsRailBadge[] = useMemo(
    () =>
      annotations.map((a) => ({
        annotationId: a.id,
        colorIndex: a.colorIndex,
        label: a.label,
      })),
    [annotations],
  );

  const pins: PinDescriptor[] = useMemo(() => {
    const out: PinDescriptor[] = [];
    for (const a of annotations) {
      for (const anchor of a.anchors) {
        out.push({
          annotationId: a.id,
          colorIndex: a.colorIndex,
          label: a.label,
          anchor,
          status: a.id === activeId ? 'active' : 'idle',
          tooltip: `Annotation #${String(a.label).padStart(3, '0')}`,
        });
      }
    }
    pendingPins.forEach((p, i) => {
      out.push({
        annotationId: `__pending-${p.id}`,
        colorIndex: nextColorIndex,
        label: i + 1,
        anchor: p.anchor,
        status: 'pending',
      });
    });
    return out;
  }, [annotations, activeId, pendingPins, nextColorIndex]);

  const onActivate = useCallback((annotationId: string) => {
    setActiveId(annotationId);
  }, []);

  const onPinClick = useCallback((annotationId: string) => {
    if (annotationId.startsWith('__pending-')) {
      const id = annotationId.slice('__pending-'.length);
      setPendingPins((p) => p.filter((pp) => pp.id !== id));
      return;
    }
    setActiveId(annotationId);
    // Pin clicks signal intent to interact — expand the rail so the
    // matching card is visible without an extra hover gesture.
    setRailExpandSignal((n) => (n ?? 0) + 1);
  }, []);

  const onCreate = useCallback(() => {
    setComposerOpen(true);
    setPendingPins([]);
  }, []);

  const onComposerCancel = useCallback(() => {
    setComposerOpen(false);
    setMarking(false);
    setPendingPins([]);
  }, []);

  const onComposerPost = useCallback(
    async (body: string) => {
      const created = await onCreateAnnotation?.({
        body,
        anchors: pendingPins.map((p) => p.anchor),
        colorIndex: nextColorIndex,
      });
      if (created) {
        prependCreated(created);
        setActiveId(created.id);
      }
      setComposerOpen(false);
      setMarking(false);
      setPendingPins([]);
    },
    [onCreateAnnotation, pendingPins, nextColorIndex, prependCreated],
  );

  const onMarkingToggle = useCallback(() => setMarking((m) => !m), []);
  const onZoomChange = useCallback((next: number) => setZoom(next), []);

  // Stable identifier for the current "containing block" geometry —
  // bumped whenever fullscreen toggles change which element owns the
  // canvas bounds. Used to invalidate the pin layer's positioning
  // cache and to clear the rail/toolbar's dragged coordinates.
  const layoutKey = isFullscreen ? 'fs' : 'win';
  const repositionKey = `${zoom}:${layoutKey}`;

  const onAnnotationStatus = useCallback(
    async (annotationId: string, status: AnnotationStatus) => {
      await changeStatus(annotationId, status);
    },
    [changeStatus],
  );

  const onAnnotationDeleteRow = useCallback(
    async (annotationId: string) => {
      const ok = await deleteAnnotation(annotationId);
      if (ok) {
        setActiveId((cur) => (cur === annotationId ? null : cur));
        setOpenThreadId((cur) => (cur === annotationId ? null : cur));
      }
    },
    [deleteAnnotation],
  );

  return (
    <AppMain variant="viewer" ariaLabel="Mockup viewer">
      <div
        ref={appMainRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--bg-iframe)',
        }}
      >
        <ViewerCanvas
          mockupSrc={mockupSrc}
          iframeRef={iframeRef}
          canvasRootRef={canvasRootRef}
          iframeGen={iframeGen}
          marking={marking}
          zoom={zoom}
          pins={pins}
          onPinClick={onPinClick}
          repositionKey={repositionKey}
        />

        <AnnotationsRail
          boundsRef={appMainRef}
          badges={badges}
          activeAnnotationId={activeId}
          onBadgeClick={onActivate}
          onCreate={onCreate}
          count={annotations.length}
          resetPositionKey={layoutKey}
          expandSignal={railExpandSignal}
        >
          {annotations.map((a) => (
            <AnnotationCard
              key={a.id}
              annotationId={a.id}
              label={a.label}
              colorIndex={a.colorIndex}
              status={a.status}
              author={a.author}
              date={a.date}
              primary={a.primary}
              replies={a.replies}
              currentUser={currentUser}
              active={a.id === activeId}
              threadOpen={a.id === openThreadId}
              onThreadToggle={() => onThreadToggle(a.id)}
              onActivate={() => onActivate(a.id)}
              onPostReply={(body) => postReply(a.id, body)}
              onCommentEditSave={(commentId, newBody) => editComment(commentId, newBody)}
              onCommentDelete={(commentId) => deleteComment(commentId)}
              onCommentReact={(commentId, emoji) => toggleReaction(commentId, emoji)}
              onAnnotationStatusChange={(status) => onAnnotationStatus(a.id, status)}
              onAnnotationDelete={() => onAnnotationDeleteRow(a.id)}
            />
          ))}
        </AnnotationsRail>

        <CanvasToolbar
          boundsRef={appMainRef}
          onZoomChange={onZoomChange}
          onFullscreenToggle={onFullscreenToggle}
          isFullscreen={isFullscreen}
          resetPositionKey={layoutKey}
          versionChip={
            <VersionChip
              versions={versions}
              onSelect={onVersionSelect}
              onPromote={onVersionPromote}
              onDelete={onVersionDelete}
            />
          }
        />

        <AnnotationComposer
          open={composerOpen}
          marking={marking}
          pendingPins={pendingPins.map((p) => p.anchor)}
          onEnterMarking={onMarkingToggle}
          onCancel={onComposerCancel}
          onPost={onComposerPost}
        />

        <MarkingBar open={marking} pinCount={pendingPins.length} onDone={() => setMarking(false)} />
      </div>
    </AppMain>
  );
}

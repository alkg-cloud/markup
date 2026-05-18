'use client';
/**
 * AppMainViewer — composition of all the new viewer components.
 *
 * The redesign of MockupViewer per `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md`.
 * This replaces the old chrome-heavy viewer (topbar + sidebar) with the
 * floating-cockpit layout: full-viewport canvas with the AnnotationsRail
 * (left), CanvasToolbar (center-bottom), AnnotationComposer (modal),
 * MarkingBar (top during marking), and PinLayer overlay.
 *
 * Currently a scaffold — wires the components together with placeholder
 * data so the page renders. Full data integration with the API layer
 * lands in the follow-up (Phase 11.5 — see plan).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnnotationCard, type AnnotationStatus, type ThreadComment } from '@/components/AnnotationCard';
import { AnnotationComposer } from '@/components/AnnotationComposer';
import { AnnotationsRail, type AnnotationsRailBadge } from '@/components/AnnotationsRail';
import { AppMain } from '@/components/AppMain/AppMain';
import { CanvasToolbar } from '@/components/CanvasToolbar';
import { MarkingBar } from '@/components/MarkingBar';
import { PinLayer, type PinDescriptor } from '@/components/PinLayer';
import { VersionChip, type VersionRow } from '@/components/VersionChip';
import type { Anchor } from '@/lib/anchoring';

export interface AppMainAnnotation {
  id: string;
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
  mockupId: string;
  mockupName: string;
  /** Iframe src for the mockup's index.html — drives the canvas. */
  mockupSrc: string;
  /** Display name of the logged-in user. */
  currentUser: string;
  versions: VersionRow[];
  initialAnnotations: AppMainAnnotation[];

  onCreateAnnotation?: (input: {
    body: string;
    anchors: Anchor[];
  }) => Promise<{ id: string; colorIndex: number } | null>;
  onPostReply?: (annotationId: string, body: string) => Promise<void>;
  onReactionToggle?: (commentId: string, emoji: string) => Promise<void>;
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
  onVersionSelect,
  onVersionPromote,
  onVersionDelete,
}: AppMainViewerProps) {
  const appMainRef = useRef<HTMLElement | null>(null);
  const canvasRootRef = useRef<HTMLIFrameElement | null>(null);
  // Anchoring runtime resolves selectors against the iframe document.
  // For now point at the iframe element itself; the wire-up will replace
  // this with the iframe's contentDocument once cross-frame access lands.
  const anchorRootRef = useRef<Element | null>(null);

  const [annotations, setAnnotations] = useState<AppMainAnnotation[]>(initialAnnotations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [pendingPins, setPendingPins] = useState<Anchor[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setFullscreen] = useState(false);

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
    // Render pending pins on top with a `pending` status so PinLayer
    // shows them as dashed rings during marking mode.
    pendingPins.forEach((p, i) => {
      out.push({
        annotationId: `__pending-${i}`,
        colorIndex: 0,
        label: i + 1,
        anchor: p,
        status: 'pending',
      });
    });
    return out;
  }, [annotations, activeId, pendingPins]);

  const onActivate = useCallback((annotationId: string) => {
    setActiveId(annotationId);
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
      const result = await onCreateAnnotation?.({ body, anchors: pendingPins });
      if (result) {
        // Optimistic append; full data sync happens in the parent.
        // Placeholder: the parent will re-feed initialAnnotations.
      }
      setComposerOpen(false);
      setMarking(false);
      setPendingPins([]);
    },
    [onCreateAnnotation, pendingPins],
  );

  const onMarkingToggle = useCallback(() => setMarking((m) => !m), []);

  const onFullscreenToggle = useCallback(() => {
    const el = appMainRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else {
      void el.requestFullscreen?.();
    }
  }, []);

  // Reflect fullscreen state in our local flag for the toolbar UI.
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const onZoomChange = useCallback((next: number) => {
    setZoom(next);
    // The iframe parent applies CSS transform; pin reposition happens
    // synchronously inside PinLayer because the useAnchoredPins hook
    // observes the canvas root.
  }, []);

  return (
    <AppMain variant="viewer" ariaLabel="Mockup viewer">
      <div
        ref={appMainRef as React.RefObject<HTMLDivElement>}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-iframe, #f4ede0)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'auto',
          }}
        >
          <iframe
            ref={(el) => {
              canvasRootRef.current = el;
              anchorRootRef.current = el;
            }}
            src={mockupSrc}
            title="Mockup"
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          />
        </div>

        <PinLayer
          canvasRootRef={anchorRootRef}
          pins={pins}
          onPinClick={onActivate}
        />

        <AnnotationsRail
          boundsRef={appMainRef}
          badges={badges}
          activeAnnotationId={activeId}
          onBadgeClick={onActivate}
          onCreate={onCreate}
          count={annotations.length}
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
              onActivate={() => onActivate(a.id)}
              onPostReply={(body) => onPostReply?.(a.id, body)}
              onCommentReact={(commentId, emoji) =>
                onReactionToggle?.(commentId, emoji)
              }
            />
          ))}
        </AnnotationsRail>

        <CanvasToolbar
          boundsRef={appMainRef}
          onZoomChange={onZoomChange}
          onFullscreenToggle={onFullscreenToggle}
          isFullscreen={isFullscreen}
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
          pendingPins={pendingPins}
          onEnterMarking={onMarkingToggle}
          onCancel={onComposerCancel}
          onPost={onComposerPost}
        />

        <MarkingBar
          open={marking}
          pinCount={pendingPins.length}
          onDone={() => setMarking(false)}
        />
      </div>
    </AppMain>
  );
}

'use client';
/**
 * AppMainViewer — composition of the redesigned floating-cockpit viewer.
 *
 * Per `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md`.
 * The mockup loads in a same-origin iframe; the canvas root is set to
 * the iframe document's <html> after load. PinLayer + click capture
 * cross the boundary via the cross-document anchoring runtime
 * (`docs/superpowers/specs/2026-05-18-pin-anchoring-strategy.md`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { type PinDescriptor, PinLayer } from '@/components/PinLayer';
import { VersionChip, type VersionRow } from '@/components/VersionChip';
import { type Anchor, buildAnchorFromClick } from '@/lib/anchoring';

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
  mockupId: string;
  mockupName: string;
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
  /** Edit a comment's body. Receives the new body string on success
   *  (caller updates optimistic state); returns null when the user
   *  cancels or the request fails. */
  onCommentEdit?: (commentId: string, currentBody: string) => Promise<string | null>;
  /** Delete a comment. Returns true on success. */
  onCommentDelete?: (commentId: string) => Promise<boolean>;
  onVersionSelect?: (versionId: string) => void;
  onVersionPromote?: (versionId: string) => void;
  onVersionDelete?: (versionId: string) => void;
}

const COLOR_PALETTE_SIZE = 16;

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
  onVersionSelect,
  onVersionPromote,
  onVersionDelete,
}: AppMainViewerProps) {
  const appMainRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const canvasRootRef = useRef<Element | null>(null);

  const [annotations, setAnnotations] = useState<AppMainAnnotation[]>(initialAnnotations);
  // Sync local state when the parent reseeds `initialAnnotations` — this
  // fires after `router.refresh()` in the wired wrapper, so newly
  // created/promoted/deleted annotations from the server reach the UI
  // without a full page reload.
  useEffect(() => {
    setAnnotations(initialAnnotations);
  }, [initialAnnotations]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  // Pending pins use a stable client id keyed by creation so an index
  // shuffle (remove pin 2 of 4) doesn't shift React keys onto a different
  // anchor's identity.
  const [pendingPins, setPendingPins] = useState<{ id: string; anchor: Anchor }[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setFullscreen] = useState(false);
  // Bumped on iframe load to force PinLayer to remount and re-bind to
  // the new contentDocument's elements after a version switch.
  const [iframeGen, setIframeGen] = useState(0);

  const nextColorIndex = useMemo(
    () => annotations.length % COLOR_PALETTE_SIZE,
    [annotations.length],
  );

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

  // Bind canvasRootRef and capture clicks in marking mode whenever the
  // iframe reloads (initial load, version switch, src change).
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      canvasRootRef.current = doc.documentElement;
      setIframeGen((n) => n + 1);
    };
    iframe.addEventListener('load', onLoad);
    // If the iframe was already loaded when this effect runs, capture now.
    if (iframe.contentDocument?.readyState === 'complete') onLoad();
    return () => iframe.removeEventListener('load', onLoad);
  }, []);

  // Click capture inside the iframe: when marking is on, every click
  // becomes a pending pin; when marking is off, click-on-background
  // deactivates the current annotation.
  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const root = canvasRootRef.current;
    if (!doc || !root) return;
    const onClick = (e: Event) => {
      const me = e as MouseEvent;
      const target = me.target as Element | null;
      if (!target) return;
      if (marking) {
        const anchor = buildAnchorFromClick({
          canvasRoot: root,
          target,
          clientX: me.clientX,
          clientY: me.clientY,
        });
        if (anchor) {
          setPendingPins((p) => [
            ...p,
            { id: `pp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, anchor },
          ]);
          e.preventDefault();
          e.stopPropagation();
        }
      } else {
        setActiveId(null);
      }
    };
    doc.addEventListener('click', onClick, true);
    return () => doc.removeEventListener('click', onClick, true);
  }, [marking, iframeGen]);

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
        setAnnotations((prev) => [created, ...prev]);
        setActiveId(created.id);
      }
      setComposerOpen(false);
      setMarking(false);
      setPendingPins([]);
    },
    [onCreateAnnotation, pendingPins, nextColorIndex],
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

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const onZoomChange = useCallback((next: number) => setZoom(next), []);

  const onPostReplyForCard = useCallback(
    async (annotationId: string, body: string) => {
      const reply = await onPostReply?.(annotationId, body);
      if (!reply) return;
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === annotationId ? { ...a, replies: [reply, ...(a.replies ?? [])] } : a,
        ),
      );
    },
    [onPostReply],
  );

  const onCommentEditForCard = useCallback(
    async (commentId: string) => {
      // Look up the comment's current body across all annotations.
      let current: string | null = null;
      for (const a of annotations) {
        if (a.primary.id === commentId) {
          current = a.primary.body;
          break;
        }
        const r = a.replies?.find((m) => m.id === commentId);
        if (r) {
          current = r.body;
          break;
        }
      }
      if (current === null) return;
      const next = await onCommentEdit?.(commentId, current);
      if (next === null || next === undefined) return;
      setAnnotations((prev) =>
        prev.map((a) => {
          if (a.primary.id === commentId) {
            return { ...a, primary: { ...a.primary, body: next } };
          }
          if (a.replies?.some((r) => r.id === commentId)) {
            return {
              ...a,
              replies: a.replies.map((r) => (r.id === commentId ? { ...r, body: next } : r)),
            };
          }
          return a;
        }),
      );
    },
    [annotations, onCommentEdit],
  );

  const onCommentDeleteForCard = useCallback(
    async (commentId: string) => {
      const ok = await onCommentDelete?.(commentId);
      if (!ok) return;
      setAnnotations((prev) =>
        prev.map((a) => {
          if (a.replies?.some((r) => r.id === commentId)) {
            return { ...a, replies: a.replies.filter((r) => r.id !== commentId) };
          }
          return a;
        }),
      );
    },
    [onCommentDelete],
  );

  const onCommentReact = useCallback(
    async (commentId: string, emoji: string) => {
      await onReactionToggle?.(commentId, emoji);
      // Optimistic toggle: mutate the matching comment's reactions array.
      setAnnotations((prev) =>
        prev.map((a) => {
          const all = [a.primary, ...(a.replies ?? [])];
          let touched = false;
          const updated = all.map((c) => {
            if (c.id !== commentId) return c;
            touched = true;
            const reactions = c.reactions ?? [];
            const existing = reactions.find((r) => r.emoji === emoji);
            if (!existing) {
              return {
                ...c,
                reactions: [...reactions, { emoji, reactedBy: [currentUser] }],
              };
            }
            const hasMe = existing.reactedBy.includes(currentUser);
            const nextUsers = hasMe
              ? existing.reactedBy.filter((u) => u !== currentUser)
              : [...existing.reactedBy, currentUser];
            const nextReactions = reactions
              .map((r) => (r.emoji === emoji ? { ...r, reactedBy: nextUsers } : r))
              .filter((r) => r.reactedBy.length > 0);
            return { ...c, reactions: nextReactions };
          });
          if (!touched) return a;
          return {
            ...a,
            primary: updated[0],
            replies: updated.slice(1),
          };
        }),
      );
    },
    [onReactionToggle, currentUser],
  );

  return (
    <AppMain variant="viewer" ariaLabel="Mockup viewer">
      <div
        ref={appMainRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--bg-iframe, #f4ede0)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'auto',
            cursor: marking ? 'crosshair' : 'default',
          }}
        >
          <iframe
            ref={iframeRef}
            src={mockupSrc}
            title="Mockup"
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              pointerEvents: marking ? 'auto' : 'auto',
            }}
          />
        </div>

        <PinLayer
          key={iframeGen}
          canvasRootRef={canvasRootRef}
          pins={pins}
          onPinClick={onPinClick}
          repositionKey={`${zoom}:${isFullscreen ? 'fs' : 'win'}`}
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
              onPostReply={(body) => onPostReplyForCard(a.id, body)}
              onCommentEdit={(commentId) => onCommentEditForCard(commentId)}
              onCommentDelete={(commentId) => onCommentDeleteForCard(commentId)}
              onCommentReact={(commentId, emoji) => onCommentReact(commentId, emoji)}
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

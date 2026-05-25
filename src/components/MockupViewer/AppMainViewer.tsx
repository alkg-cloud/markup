'use client';
/**
 * AppMainViewer — composition of the redesigned floating-cockpit viewer.
 *
 * Per `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` and
 * the `docs/superpowers/specs/2026-05-22-draft-annotation-tech-spec.md`
 * draft-annotation rewrite.
 *
 * The mockup loads in a same-origin iframe; the canvas root is set to
 * the iframe document's <html> after load. PinLayer + click capture
 * cross the boundary via the cross-document anchoring runtime
 * (`docs/superpowers/specs/2026-05-18-pin-anchoring-strategy.md`).
 *
 * Owns the **single draft state machine** that powers the inline
 * DraftCard (mounted in the rail's `renderDraft` slot). Clicks inside
 * the canvas while a draft is active drop draft pins; clicking a draft
 * pin removes it with a 200 ms fade. No more "marking mode" toggle —
 * the draft existence IS the mode.
 *
 * State and effects are split across focused hooks:
 *   - `useAppMainAnnotations` — annotation list + reply/edit/delete/react
 *   - `useViewerCanvas`        — iframe wiring + classified click capture
 *   - `useViewerFullscreen`    — fullscreen toggle + state mirror
 *   - `useDraftPersistence`    — localStorage restore + debounced write
 *   - `useDraftKeyboard`       — N / Esc / Cmd+Enter / Cmd+S shortcuts
 * and a memoized `ViewerCanvas` sub-component holds the iframe + PinLayer
 * so draft/rail churn doesn't reload the mockup.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AnnotationCard,
  type AnnotationStatus,
  type ThreadComment,
} from '@/components/AnnotationCard';
import { AnnotationsRail, type AnnotationsRailBadge } from '@/components/AnnotationsRail';
import { AppMain } from '@/components/AppMain/AppMain';
import { CanvasToolbar } from '@/components/CanvasToolbar';
import { DraftCard } from '@/components/DraftCard';
import type { PinDescriptor } from '@/components/PinLayer';
import { useToast } from '@/components/Toast/useToast';
import { VersionChip, type VersionRow } from '@/components/VersionChip';
import { useDraftKeyboard } from '@/hooks/useDraftKeyboard';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import type { Anchor } from '@/lib/anchoring';
import styles from './AppMainViewer.module.css';
import { type DraftState, type DraftStatus, MAX_PINS, type StoredDraft } from './draft-types';
import { useAppMainAnnotations } from './useAppMainAnnotations';
import { type PinClick, useViewerCanvas } from './useViewerCanvas';
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
}: AppMainViewerProps) {
  const appMainRef = useRef<HTMLDivElement | null>(null);
  const toast = useToast();

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

  // ── Draft state machine ──────────────────────────────────────────
  // `draft === null` means no draft is open. While `draft` exists,
  // every canvas click drops a pin (no marking-mode toggle); clicks
  // on a draft pin remove it; clicks on a published pin focus its
  // card in the rail. The status enum drives the DraftCard's footer
  // microcopy and button enabled-states.
  const [draft, setDraft] = useState<DraftState>(null);
  const [status, setStatus] = useState<DraftStatus>('unsaved');
  const [removingPinIndex, setRemovingPinIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [zoom, setZoom] = useState(1);
  // Bumped each time the user clicks a canvas pin so the rail pins
  // itself open. Decoupling the trigger from `activeId` lets the rail
  // stay collapsed when the active annotation changes from the rail
  // itself (e.g. accordion thread toggle). Starts `undefined` so the
  // rail's expand-signal effect skips the initial commit and the rail
  // only pins after a real pin-click.
  const [railExpandSignal, setRailExpandSignal] = useState<number | undefined>(undefined);

  const handleRestore = useCallback((stored: StoredDraft) => {
    setDraft({
      body: stored.body,
      pins: stored.pins as Anchor[],
      lastSavedAt: stored.lastSavedAt,
      hasUnsavedChanges: false,
    });
    setStatus('saved');
  }, []);

  const handleFlushed = useCallback((lastSavedAt: number) => {
    setDraft((d) => (d ? { ...d, lastSavedAt, hasUnsavedChanges: false } : null));
    setStatus('saved');
  }, []);

  const { flush, clear } = useDraftPersistence({
    mockupId,
    userId: currentUser,
    draft,
    onRestore: handleRestore,
    onFlushed: handleFlushed,
  });

  // ── Draft actions ────────────────────────────────────────────────
  const openDraft = useCallback(() => {
    setDraft((d) => d ?? { body: '', pins: [], lastSavedAt: null, hasUnsavedChanges: false });
    setStatus((s) => (s === 'saved' ? s : 'unsaved'));
    // Defer focus so the textarea is in the DOM by the time we focus it.
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, []);

  const cancelDraft = useCallback(() => {
    clear();
    setDraft(null);
    setStatus('unsaved');
    setRemovingPinIndex(null);
  }, [clear]);

  const saveDraft = useCallback(() => {
    setStatus('saving');
    flush();
  }, [flush]);

  const handleBodyChange = useCallback((body: string) => {
    setDraft((d) => (d ? { ...d, body, hasUnsavedChanges: true } : null));
    setStatus('unsaved');
  }, []);

  const sendDraft = useCallback(async () => {
    if (!draft || draft.body.length === 0) return;
    setStatus('sending');
    try {
      const created = await onCreateAnnotation?.({
        body: draft.body,
        anchors: draft.pins,
        colorIndex: nextColorIndex,
      });
      if (!created) {
        toast.show("Couldn't send — try again. Draft saved locally.");
        setStatus('error');
        return;
      }
      prependCreated(created);
      setActiveId(created.id);
      clear();
      setDraft(null);
      setStatus('unsaved');
      setRemovingPinIndex(null);
    } catch {
      toast.show("Couldn't send — try again. Draft saved locally.");
      setStatus('error');
    }
  }, [draft, onCreateAnnotation, nextColorIndex, prependCreated, clear, toast]);

  // useDraftKeyboard is mounted further below — after `useViewerCanvas`
  // gives us the iframeRef so the hook can bridge keydown events from
  // inside the mockup iframe (same-origin) into the parent doc handler.

  // ── Canvas click dispatcher ──────────────────────────────────────
  // `useViewerCanvas` only engages anchor classification when a draft is
  // open (gated via `draftActive` below); existing pin clicks are routed
  // independently. The hook emits one of:
  //   - onPin(anchor)        — empty-area click that resolved to an anchor
  //   - onPinClick({ kind }) — click landed on an existing pin
  //   - onMiss()             — unresolvable click (no anchor, no pin)
  // The dispatcher routes by draft state + hit kind.
  const handlePin = useCallback(
    (anchor: Anchor) => {
      if (!draft) return; // only accept pins while a draft is active
      if (draft.pins.length >= MAX_PINS) {
        toast.show(`Maximum ${MAX_PINS} pins per annotation`);
        return;
      }
      setDraft((d) => (d ? { ...d, pins: [...d.pins, anchor], hasUnsavedChanges: true } : null));
      setStatus('unsaved');
    },
    [draft, toast],
  );

  const removeDraftPin = useCallback((pinIndex: number) => {
    setRemovingPinIndex(pinIndex);
    // Defer the actual splice so the [data-removing="true"] opacity
    // transition (200 ms) has time to run. After the transition, drop
    // the pin and clear the fade marker.
    setTimeout(() => {
      setDraft((d) =>
        d ? { ...d, pins: d.pins.filter((_, i) => i !== pinIndex), hasUnsavedChanges: true } : null,
      );
      setRemovingPinIndex(null);
      setStatus('unsaved');
    }, 220);
  }, []);

  const handlePinClick = useCallback(
    (click: PinClick) => {
      if (click.kind === 'draft') {
        removeDraftPin(click.pinIndex);
      } else {
        setActiveId(click.annotationId);
        setRailExpandSignal((n) => (n ?? 0) + 1);
      }
    },
    [removeDraftPin],
  );

  const handleMiss = useCallback(() => {
    setActiveId(null);
  }, []);

  const { iframeRef, canvasRootRef, iframeGen } = useViewerCanvas({
    // Gate the anchor-capture path on draft state. Outside drafting the
    // mockup iframe stays interactive (links, buttons, embedded UI).
    // Matches the existing `if (!draft) return` guard in `handlePin`.
    draftActive: draft !== null,
    onPin: handlePin,
    onPinClick: handlePinClick,
    onMiss: handleMiss,
  });

  useDraftKeyboard({
    draft,
    onOpen: openDraft,
    onCancel: cancelDraft,
    onSend: sendDraft,
    onSave: saveDraft,
    textareaRef,
    iframeRef,
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
    return out;
  }, [annotations, activeId]);

  const draftPins = useMemo<Anchor[]>(() => draft?.pins ?? [], [draft]);

  const onActivate = useCallback((annotationId: string) => {
    setActiveId(annotationId);
  }, []);

  const onPublishedPinClick = useCallback((annotationId: string) => {
    setActiveId(annotationId);
    // Pin clicks signal intent to interact — expand the rail so the
    // matching card is visible without an extra hover gesture.
    setRailExpandSignal((n) => (n ?? 0) + 1);
  }, []);

  const onDraftPinClick = useCallback(
    (pinIndex: number) => {
      removeDraftPin(pinIndex);
    },
    [removeDraftPin],
  );

  const onCreate = useCallback(() => {
    openDraft();
  }, [openDraft]);

  const onZoomChange = useCallback((next: number) => setZoom(next), []);

  // Stable identifier for the current "containing block" geometry —
  // bumped whenever fullscreen toggles change which element owns the
  // canvas bounds. Used to invalidate the pin layer's positioning
  // cache and to clear the rail/toolbar's dragged coordinates.
  const layoutKey = isFullscreen ? 'fs' : 'win';
  const repositionKey = `${zoom}:${layoutKey}`;

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

  const draftActive = draft !== null;

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
          marking={draftActive}
          zoom={zoom}
          pins={pins}
          draftPins={draftPins}
          draftColorIndex={nextColorIndex}
          removingPinIndex={removingPinIndex}
          onPublishedPinClick={onPublishedPinClick}
          onDraftPinClick={onDraftPinClick}
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
          draft={draftActive ? { active: true } : null}
          forceExpand={draftActive}
          renderDraft={
            draft
              ? () => (
                  <DraftCard
                    ref={textareaRef}
                    draft={draft}
                    status={status}
                    onBodyChange={handleBodyChange}
                    onCancel={cancelDraft}
                    onSave={saveDraft}
                    onSend={sendDraft}
                  />
                )
              : undefined
          }
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
              onAnnotationStatusChange={async (s) => {
                await changeStatus(a.id, s);
              }}
              onAnnotationDelete={() => onAnnotationDeleteRow(a.id)}
              viewerIsAdmin={viewerIsAdmin}
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

        {draftActive && (
          <div className={styles.canvasHint} data-hint-position="top">
            <CanvasHintIcon />
            <span>Click anywhere to add a pin · click a draft pin to remove</span>
          </div>
        )}
      </div>
    </AppMain>
  );
}

/**
 * `MdOutlineAddLocationAlt` SVG path — inlined verbatim so the hint
 * pill keeps a single bundle dependency on `react-icons` only when it
 * actually needs the icon elsewhere. The path is copied from
 * `react-icons/md/index.mjs` for `MdOutlineAddLocationAlt`.
 */
function CanvasHintIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="none" d="M0 0h24v24H0z" />
      <path d="M20 1v3h3v2h-3v3h-2V6h-3V4h3V1h2zm-8 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm1-9.94v2.02A6.53 6.53 0 0 0 12 5c-3.35 0-6 2.57-6 6.2 0 2.34 1.95 5.44 6 9.14 4.05-3.7 6-6.79 6-9.14V11h2v.2c0 3.32-2.67 7.25-8 11.8-5.33-4.55-8-8.48-8-11.8C4 6.22 7.8 3 12 3c.34 0 .67.02 1 .06z" />
    </svg>
  );
}

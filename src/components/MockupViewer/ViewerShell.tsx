'use client';
/**
 * ViewerShell — the bare canvas + rail + toolbar composition shared by
 * the production viewer (via AppMainViewer / AppMainShell) and the
 * landing-page interactive demo. Owns three-layer geometry, the single
 * draft state machine, pin-layer composition, rail wiring, and toolbar
 * wiring. Network calls, version UI, historic mode, and URL composition
 * live in callers.
 *
 * See `docs/superpowers/specs/2026-05-28-tldraw-removal-and-viewer-shell-design.md`
 * for the public-API contract and the hot-spot resolutions.
 */
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import {
  AnnotationCard,
  type AnnotationStatus,
  type ThreadComment,
} from '@/components/AnnotationCard';
import { AnnotationsRail, type AnnotationsRailBadge } from '@/components/AnnotationsRail';
import { CanvasToolbar } from '@/components/CanvasToolbar';
import { DraftCard } from '@/components/DraftCard';
import type { PinDescriptor } from '@/components/PinLayer';
import { useDraftKeyboard } from '@/hooks/useDraftKeyboard';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import type { Anchor } from '@/lib/anchoring';
import type { AppMainAnnotation } from './AppMainViewer';
import { type DraftState, type DraftStatus, MAX_PINS, type StoredDraft } from './draft-types';
import { useAppMainAnnotations } from './useAppMainAnnotations';
import { type PinClick, useViewerCanvas } from './useViewerCanvas';
import { useViewerFullscreen } from './useViewerFullscreen';
import { useViewport } from './useViewport';
import { ViewerCanvas } from './ViewerCanvas';
import styles from './ViewerShell.module.css';
import type { ViewportState } from './viewport-presets';

/** Time (ms) for the draft-pin fade-out CSS transition. The pin stays in
 *  the array under `data-removing="true"` for the duration of the fade,
 *  then is spliced out. Must match the `opacity` transition in PinLayer. */
const REMOVE_PIN_FADE_MS = 220;

export interface CreateAnnotationInput {
  body: string;
  anchors: Anchor[];
  colorIndex: number;
}

export interface ViewerShellProps {
  /** Stable identifier scoping the viewport + draft localStorage keys.
   *  Prod: mockupId. Demo: 'demo'. */
  scopeId: string;
  /** Current user identifier; part of the draft storage key. Also drives
   *  optimistic comment ownership in reaction toggles. */
  userId: string;
  /** Discriminated iframe source. Sandbox stays `allow-same-origin` in
   *  both modes — the parent reads iframe DOM for click-anchoring. */
  mockupSrc: { kind: 'src'; url: string } | { kind: 'srcDoc'; html: string };
  /** Annotation seed (adapter-controlled). Optimistic mutations layer on
   *  top of this list internally. */
  annotations: AppMainAnnotation[];

  onCreateAnnotation?: (input: CreateAnnotationInput) => Promise<AppMainAnnotation | null>;
  onPostReply?: (annotationId: string, body: string) => Promise<ThreadComment | null>;
  onReactionToggle?: (commentId: string, emoji: string) => Promise<void>;
  onCommentEdit?: (commentId: string, newBody: string) => Promise<boolean>;
  onCommentDelete?: (commentId: string) => Promise<boolean>;
  onAnnotationStatusChange?: (annotationId: string, status: AnnotationStatus) => Promise<boolean>;
  onAnnotationDelete?: (annotationId: string) => Promise<boolean>;

  /** Widens delete access for admin viewers (annotations + comments). */
  viewerIsAdmin?: boolean;

  /** Internal `useDraftPersistence` runs only when `enabled !== false`.
   *  Demo passes `{ enabled: false }` so writes are skipped while the
   *  state machine (status transitions, lastSavedAt updates) still runs. */
  draftPersistence?: {
    enabled?: boolean;
    storageKey?: string;
    debounceMs?: number;
  };

  /** Banner rendered above the canvas (e.g. "Viewing older version — exit").
   *  Presence of this slot also gates the draft UI: when defined, the rail
   *  goes read-only, the draft hint pill is suppressed, and the keyboard
   *  shortcuts are disabled — the caller's historic mode is detected from
   *  the slot's presence, not a separate flag. */
  renderHistoricBanner?: () => ReactNode;
  /** Chip rendered in CanvasToolbar's `extra` slot (e.g. version selector). */
  renderToolbarChip?: () => ReactNode;

  /** Toast callback. Default: `console.warn(message)`. */
  toast?: (message: string, level?: 'info' | 'error') => void;
}

export function ViewerShell({
  scopeId,
  userId,
  mockupSrc,
  annotations: initialAnnotations,
  onCreateAnnotation,
  onPostReply,
  onReactionToggle,
  onCommentEdit,
  onCommentDelete,
  onAnnotationStatusChange,
  onAnnotationDelete,
  viewerIsAdmin = false,
  draftPersistence,
  renderHistoricBanner,
  renderToolbarChip,
  toast,
}: ViewerShellProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const showToast = useCallback(
    (message: string, level?: 'info' | 'error') => {
      if (toast) {
        toast(message, level);
        return;
      }
      console.warn(message);
    },
    [toast],
  );

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
    currentUser: userId,
    onPostReply,
    onReactionToggle,
    onCommentEdit,
    onCommentDelete,
    onAnnotationStatusChange,
    onAnnotationDelete,
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const onThreadToggle = useCallback((annotationId: string) => {
    setOpenThreadId((cur) => (cur === annotationId ? null : annotationId));
  }, []);

  // ── Draft state machine ──────────────────────────────────────────
  const [draft, setDraft] = useState<DraftState>(null);
  const [status, setStatus] = useState<DraftStatus>('unsaved');
  const [removingPinIndex, setRemovingPinIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const { viewport, setViewport, presets } = useViewport(scopeId);
  const handleViewportChange = useCallback(
    (next: ViewportState) => {
      // Reset zoom only on chip selection. Heuristic: a chip click lands
      // on a canonical preset size (either orientation); a drag yields
      // pixel-precise W/H that won't match, leaving zoom intact.
      const isCanonicalPresetSize =
        next.width !== null &&
        next.height !== null &&
        Object.values(presets).some(
          (p) =>
            (next.width === p.width && next.height === p.height) ||
            (next.width === p.height && next.height === p.width),
        );
      const modeChanged = next.mode !== viewport.mode;
      if (modeChanged && next.mode !== 'fit' && isCanonicalPresetSize) {
        setZoom(1);
      }
      setViewport(next);
    },
    [viewport.mode, setViewport, presets],
  );
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

  // The hook composes its storage key from `mockupId` + `userId` as
  // `markup:draft:${mockupId}:${userId}` — which matches the spec's
  // default `markup:draft:${scopeId}:${userId}` when we pass scopeId
  // through as `mockupId`. The `draftPersistence.storageKey` override is
  // not threaded into the hook yet — callers needing a non-default key
  // would extend the hook signature.
  const persistEnabled = draftPersistence?.enabled !== false;

  const { flush, clear } = useDraftPersistence({
    mockupId: scopeId,
    userId,
    draft,
    onRestore: handleRestore,
    onFlushed: handleFlushed,
    enabled: persistEnabled,
  });

  // ── Draft actions ────────────────────────────────────────────────
  const openDraft = useCallback(() => {
    setDraft((d) => d ?? { body: '', pins: [], lastSavedAt: null, hasUnsavedChanges: false });
    setStatus((s) => (s === 'saved' ? s : 'unsaved'));
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
        showToast("Couldn't send — try again. Draft saved locally.", 'error');
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
      showToast("Couldn't send — try again. Draft saved locally.", 'error');
      setStatus('error');
    }
  }, [draft, onCreateAnnotation, nextColorIndex, prependCreated, clear, showToast]);

  // ── Canvas click routing ─────────────────────────────────────────
  const handlePin = useCallback(
    (anchor: Anchor) => {
      if (!draft) return;
      if (draft.pins.length >= MAX_PINS) {
        showToast(`Maximum ${MAX_PINS} pins per annotation`, 'error');
        return;
      }
      setDraft((d) => (d ? { ...d, pins: [...d.pins, anchor], hasUnsavedChanges: true } : null));
      setStatus('unsaved');
    },
    [draft, showToast],
  );

  const removeDraftPin = useCallback((pinIndex: number) => {
    setRemovingPinIndex(pinIndex);
    setTimeout(() => {
      setDraft((d) =>
        d ? { ...d, pins: d.pins.filter((_, i) => i !== pinIndex), hasUnsavedChanges: true } : null,
      );
      setRemovingPinIndex(null);
      setStatus('unsaved');
    }, REMOVE_PIN_FADE_MS);
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

  const draftActive = draft !== null;
  // Historic mode is detected from the slot's presence — the shell itself
  // owns no historic-state concept, but it needs to suppress draft surfaces
  // so the user can't accumulate invisible pins while the banner is up.
  const historicActive = renderHistoricBanner !== undefined;
  const effectiveDraftActive = !historicActive && draftActive;

  const { iframeRef, canvasRootRef, iframeGen } = useViewerCanvas({
    draftActive: effectiveDraftActive,
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
    disabled: historicActive,
  });

  const { isFullscreen, toggle: onFullscreenToggle } = useViewerFullscreen(shellRef);

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

  const layoutKey = isFullscreen ? 'fs' : 'win';
  const viewportKey = viewport.mode === 'fit' ? 'fit' : `${viewport.width}x${viewport.height}`;
  const repositionKey = `${zoom}:${layoutKey}:${viewportKey}`;

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
    <div ref={shellRef} className={styles.shell} data-viewer-shell="">
      {renderHistoricBanner?.()}

      <ViewerCanvas
        mockupSrc={mockupSrc}
        iframeRef={iframeRef}
        canvasRootRef={canvasRootRef}
        iframeGen={iframeGen}
        marking={effectiveDraftActive}
        zoom={zoom}
        viewport={viewport}
        setViewport={handleViewportChange}
        pins={pins}
        draftPins={draftPins}
        draftColorIndex={nextColorIndex}
        removingPinIndex={removingPinIndex}
        onPublishedPinClick={onPublishedPinClick}
        onDraftPinClick={onDraftPinClick}
        repositionKey={repositionKey}
      />

      <AnnotationsRail
        boundsRef={shellRef}
        badges={badges}
        activeAnnotationId={activeId}
        onBadgeClick={onActivate}
        onCreate={onCreate}
        count={annotations.length}
        resetPositionKey={layoutKey}
        expandSignal={railExpandSignal}
        draft={draftActive ? { active: true } : null}
        forceExpand={draftActive}
        readOnly={historicActive}
        renderDraft={
          !historicActive && draft
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
            currentUser={userId}
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
            readOnly={historicActive}
          />
        ))}
      </AnnotationsRail>

      <CanvasToolbar
        boundsRef={shellRef}
        onZoomChange={onZoomChange}
        onFullscreenToggle={onFullscreenToggle}
        isFullscreen={isFullscreen}
        resetPositionKey={layoutKey}
        viewport={viewport}
        setViewport={handleViewportChange}
        extra={renderToolbarChip?.()}
      />

      {!historicActive && draftActive && (
        <div className={styles.canvasHint} data-hint-position="top">
          <CanvasHintIcon />
          <span>Click anywhere to add a pin · click a draft pin to remove</span>
        </div>
      )}
    </div>
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

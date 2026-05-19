'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnnotationStatus, ThreadComment } from '@/components/AnnotationCard';
import type { AppMainAnnotation } from './AppMainViewer';

const COLOR_PALETTE_SIZE = 16;

interface UseAnnotationsOptions {
  initialAnnotations: AppMainAnnotation[];
  currentUser: string;
  onPostReply?: (annotationId: string, body: string) => Promise<ThreadComment | null>;
  onReactionToggle?: (commentId: string, emoji: string) => Promise<void>;
  onCommentEdit?: (commentId: string, newBody: string) => Promise<boolean>;
  onCommentDelete?: (commentId: string) => Promise<boolean>;
  onAnnotationStatusChange?: (annotationId: string, status: AnnotationStatus) => Promise<boolean>;
  onAnnotationDelete?: (annotationId: string) => Promise<boolean>;
}

/* ── AppMain annotations state machine ───────────────────────────────────
 *
 * Owns the optimistic local copy of the annotation list and all the
 * reply/edit/delete/reaction handlers that mutate it. Keeping this in a
 * hook keeps `AppMainViewer` focused on layout + composition rather
 * than the half-dozen useCallbacks that wrap the wired handlers.
 */
export function useAppMainAnnotations({
  initialAnnotations,
  currentUser,
  onPostReply,
  onReactionToggle,
  onCommentEdit,
  onCommentDelete,
  onAnnotationStatusChange,
  onAnnotationDelete,
}: UseAnnotationsOptions) {
  const [annotations, setAnnotations] = useState<AppMainAnnotation[]>(initialAnnotations);

  // Sync local state when the parent reseeds `initialAnnotations` — this
  // fires after `router.refresh()` in the wired wrapper, so newly
  // created/promoted/deleted annotations from the server reach the UI
  // without a full page reload.
  useEffect(() => {
    setAnnotations(initialAnnotations);
  }, [initialAnnotations]);

  const nextColorIndex = useMemo(() => {
    // Per spec §6: "lowest unused index, cycle to 0 when all 16 are used".
    // Scan 0..15 and return the first slot not currently held by any
    // annotation; fall back to 0 when every slot is taken (then the
    // palette repeats from the start).
    const used = new Set(annotations.map((a) => a.colorIndex));
    for (let i = 0; i < COLOR_PALETTE_SIZE; i++) {
      if (!used.has(i)) return i;
    }
    return 0;
  }, [annotations]);

  const postReply = useCallback(
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

  const editComment = useCallback(
    async (commentId: string, newBody: string) => {
      const trimmed = newBody.trim();
      if (!trimmed) return;
      // Look up the comment's current body — skip the network call when
      // nothing changed.
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
      if (current === null || trimmed === current) return;
      const ok = await onCommentEdit?.(commentId, trimmed);
      if (!ok) return;
      setAnnotations((prev) =>
        prev.map((a) => {
          if (a.primary.id === commentId) {
            return { ...a, primary: { ...a.primary, body: trimmed } };
          }
          if (a.replies?.some((r) => r.id === commentId)) {
            return {
              ...a,
              replies: a.replies.map((r) => (r.id === commentId ? { ...r, body: trimmed } : r)),
            };
          }
          return a;
        }),
      );
    },
    [annotations, onCommentEdit],
  );

  const deleteComment = useCallback(
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

  const toggleReaction = useCallback(
    (commentId: string, emoji: string) => {
      // Optimistic toggle FIRST so the pill renders without waiting on the
      // network. The POST is fire-and-forget — the wired handler already
      // catches+swallows blips, and the next refresh reconciles state.
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
      void onReactionToggle?.(commentId, emoji);
    },
    [onReactionToggle, currentUser],
  );

  const changeStatus = useCallback(
    async (annotationId: string, status: AnnotationStatus) => {
      const ok = await onAnnotationStatusChange?.(annotationId, status);
      if (!ok) return false;
      setAnnotations((prev) => prev.map((p) => (p.id === annotationId ? { ...p, status } : p)));
      return true;
    },
    [onAnnotationStatusChange],
  );

  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      const ok = await onAnnotationDelete?.(annotationId);
      if (!ok) return false;
      setAnnotations((prev) => prev.filter((p) => p.id !== annotationId));
      return true;
    },
    [onAnnotationDelete],
  );

  const prependCreated = useCallback((created: AppMainAnnotation) => {
    setAnnotations((prev) => [created, ...prev]);
  }, []);

  return {
    annotations,
    nextColorIndex,
    postReply,
    editComment,
    deleteComment,
    toggleReaction,
    changeStatus,
    deleteAnnotation,
    prependCreated,
  };
}

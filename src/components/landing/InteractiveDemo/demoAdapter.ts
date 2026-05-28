/**
 * Bridges the demo's localStorage-backed state shape to the prop
 * contracts of the real product components (AnnotationsRail,
 * AnnotationCard, Comment, ReactionPill). Keeps the data plane
 * single-sourced — components don't know they're running in demo mode.
 */

import { useCallback, useMemo } from 'react';
import type { ThreadComment } from '@/components/AnnotationCard/AnnotationCard';
import type { CommentReaction } from '@/components/Comment/Comment';
import type { AppMainAnnotation } from '@/components/MockupViewer/AppMainViewer';
import type { ViewerShellProps } from '@/components/MockupViewer/ViewerShell';
import type { AnnotationStatus } from '@/lib/annotation/status';
import type { DemoAnnotation, DemoMessage, DemoReaction, DemoState } from './types';
import type { useDemoStore } from './useDemoStore';

type DemoActions = ReturnType<typeof useDemoStore>['actions'];

export const DEMO_CURRENT_USER = 'you';
const AGENT_USER = 'agent';

/** Format the demo's numeric createdAt (sequence in seeds, ms post-fact)
 *  as a short relative-ish label the AnnotationCard's foot row expects. */
function formatTimestamp(createdAt: number, anchor: number): string {
  // Seeds use 0..N as createdAt indexing. Live entries use Date.now().
  if (createdAt < 1_000_000) {
    // Seeded — synthesize relative labels based on creation order.
    const minsAgo = Math.max(1, (anchor - createdAt) * 5);
    return `${minsAgo}m ago`;
  }
  const delta = Math.max(0, Date.now() - createdAt);
  const mins = Math.floor(delta / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function toReactions(state: DemoState, messageId: string): CommentReaction[] {
  return state.reactions
    .filter((r) => r.messageId === messageId)
    .map((r) => emojiToCommentReaction(r));
}

function emojiToCommentReaction(r: DemoReaction): CommentReaction {
  // Reverse-engineer a `reactedBy` list from `{ count, mine }`.
  // Real CommentReaction uses an array of user names; demo only knows
  // total count + whether the current user reacted. Synthesize anonymous
  // 'agent-N' entries so the count + presence math both work.
  const reactedBy: string[] = [];
  if (r.mine) reactedBy.push(DEMO_CURRENT_USER);
  const others = Math.max(0, r.count - (r.mine ? 1 : 0));
  for (let i = 0; i < others; i++) reactedBy.push(`${AGENT_USER}-${i + 1}`);
  return { emoji: r.emoji, reactedBy };
}

function messageToThreadComment(
  msg: DemoMessage,
  anchor: number,
  reactions?: CommentReaction[],
): ThreadComment {
  return {
    id: msg.id,
    author: msg.author === 'you' ? 'You' : 'Agent',
    authorColorIndex: msg.author === 'you' ? 0 : 1,
    isOwn: msg.author === 'you',
    timestamp: formatTimestamp(msg.createdAt, anchor),
    body: msg.body,
    reactions,
  };
}

/**
 * Map a single DemoAnnotation onto the `AppMainAnnotation` shape that
 * `ViewerShell` consumes. Returns null if the thread or primary message
 * is missing — defensive against malformed seeded state.
 */
export function toAppMainAnnotation(
  state: DemoState,
  annotation: DemoAnnotation,
  index: number,
): AppMainAnnotation | null {
  const thread = state.threads.find((t) => t.id === annotation.threadId);
  if (!thread) return null;
  const msgs = state.messages.filter((m) => m.threadId === thread.id);
  if (msgs.length === 0) return null;

  const anchorTs = Math.max(...msgs.map((m) => m.createdAt));
  const primary = messageToThreadComment(msgs[0], anchorTs, toReactions(state, msgs[0].id));
  const replies = msgs
    .slice(1)
    .map((m) => messageToThreadComment(m, anchorTs, toReactions(state, m.id)));

  return {
    id: annotation.id,
    threadId: thread.id,
    label: index + 1,
    colorIndex: annotation.colorIndex,
    status: thread.status satisfies AnnotationStatus,
    author: primary.author,
    authorColorIndex: primary.authorColorIndex,
    date: formatTimestamp(annotation.createdAt, anchorTs),
    primary,
    replies,
    anchors: annotation.pins.map((p) => p.anchor),
  };
}

/**
 * Adapter hook that pairs `useDemoStore` with `ViewerShell`'s prop
 * contract. Returns the projected annotation list + the handler set
 * the shell expects. Handlers are stable (memoised) so the shell can
 * skip re-renders on identity-checks. Demo-only no-op handlers
 * (`onCommentEdit`, `onCommentDelete`, `onAnnotationDelete`) return
 * `false` to signal "not supported"; the shell preserves the optimistic
 * state on a `false` return.
 */
export function useDemoAdapter(state: DemoState, actions: DemoActions) {
  const annotations = useMemo<AppMainAnnotation[]>(
    () =>
      state.annotations
        .map((a, i) => toAppMainAnnotation(state, a, i))
        .filter((a): a is AppMainAnnotation => a !== null),
    [state],
  );

  const onCreateAnnotation: NonNullable<ViewerShellProps['onCreateAnnotation']> = useCallback(
    async ({ body, anchors, colorIndex }) => {
      const { annotation, thread, message } = actions.addAnnotation({
        pins: anchors,
        body,
        colorIndex,
      });
      // Synthesize an AppMainAnnotation from the freshly-created records
      // so the shell can prepend it without waiting for the next
      // `state`-driven recomputation of `annotations`. The adapter's
      // memoised `annotations` will re-emit the same record on the next
      // render; `useAppMainAnnotations` dedupes by id, so no double-insert.
      const primary: ThreadComment = messageToThreadComment(message, message.createdAt);
      return {
        id: annotation.id,
        threadId: thread.id,
        label: state.annotations.length + 1,
        colorIndex: annotation.colorIndex,
        status: thread.status satisfies AnnotationStatus,
        author: primary.author,
        authorColorIndex: primary.authorColorIndex,
        date: formatTimestamp(annotation.createdAt, message.createdAt),
        primary,
        replies: [],
        anchors: annotation.pins.map((p) => p.anchor),
      };
    },
    [state.annotations.length, actions],
  );

  const onPostReply: NonNullable<ViewerShellProps['onPostReply']> = useCallback(
    async (annotationId, body) => {
      const target = state.annotations.find((a) => a.id === annotationId);
      if (!target) return null;
      actions.addReply(target.threadId, body);
      // `addReply` is void — synthesize a ThreadComment from known
      // data. The shell's optimistic state will be reconciled on the
      // next prop refresh, when the real message rolls through
      // `toAppMainAnnotation`.
      return {
        id: `synthesized-${Date.now()}`,
        author: 'You',
        authorColorIndex: 0,
        isOwn: true,
        timestamp: 'just now',
        body: body.trim(),
        reactions: [],
      };
    },
    [state.annotations, actions],
  );

  const onReactionToggle: NonNullable<ViewerShellProps['onReactionToggle']> = useCallback(
    async (commentId, emoji) => {
      actions.toggleReaction(commentId, emoji);
    },
    [actions],
  );

  const onAnnotationStatusChange: NonNullable<ViewerShellProps['onAnnotationStatusChange']> =
    useCallback(
      async (annotationId, _status) => {
        const target = state.annotations.find((a) => a.id === annotationId);
        if (!target) return false;
        // The demo store only exposes a cyclical status transition; the
        // requested target status is ignored. The rail's optimistic state
        // is already set to the intended next status when this resolves,
        // but `cycleStatus` walks open → needs review → resolved → open
        // in lockstep with that cycle, so the next prop refresh matches.
        actions.cycleStatus(target.threadId);
        return true;
      },
      [state.annotations, actions],
    );

  const handlers = useMemo(
    () => ({
      onCreateAnnotation,
      onPostReply,
      onReactionToggle,
      // Demo doesn't support editing or deletion — return false so the
      // shell rolls back any optimistic mutation it applied.
      onCommentEdit: async (_commentId: string, _newBody: string) => false,
      onCommentDelete: async (_commentId: string) => false,
      onAnnotationStatusChange,
      onAnnotationDelete: async (_annotationId: string) => false,
    }),
    [onCreateAnnotation, onPostReply, onReactionToggle, onAnnotationStatusChange],
  );

  return { annotations, handlers };
}

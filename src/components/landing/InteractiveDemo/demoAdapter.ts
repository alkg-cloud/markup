/**
 * Bridges the demo's localStorage-backed state shape to the prop
 * contracts of the real product components (AnnotationsRail,
 * AnnotationCard, Comment, ReactionPill). Keeps the data plane
 * single-sourced — components don't know they're running in demo mode.
 */

import type {
  AnnotationCardProps,
  ThreadComment,
} from '@/components/AnnotationCard/AnnotationCard';
import type { AnnotationsRailBadge } from '@/components/AnnotationsRail/AnnotationsRail';
import type { CommentReaction } from '@/components/Comment/Comment';
import type { AnnotationStatus } from '@/lib/annotation/status';
import type { DemoAnnotation, DemoMessage, DemoReaction, DemoState, DemoThread } from './types';

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

function toReactions(state: DemoState, threadId: string): CommentReaction[] {
  return state.reactions
    .filter((r) => r.threadId === threadId)
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

export function toBadges(state: DemoState): AnnotationsRailBadge[] {
  return state.annotations.map((a, i) => ({
    annotationId: a.id,
    colorIndex: a.colorIndex,
    label: i + 1,
  }));
}

export function toCardProps(
  state: DemoState,
  annotation: DemoAnnotation,
  index: number,
  callbacks: {
    onActivate: () => void;
    onPostReply: (body: string) => void;
    onCommentReact: (commentId: string, emoji: string) => void;
    onStatusChange: (status: AnnotationStatus) => void;
    threadOpen: boolean;
    onThreadToggle: () => void;
  },
): AnnotationCardProps | null {
  const thread = state.threads.find((t) => t.id === annotation.threadId);
  if (!thread) return null;
  const msgs = state.messages.filter((m) => m.threadId === thread.id);
  if (msgs.length === 0) return null;

  // Anchor the relative timestamps off the largest createdAt seen in this
  // thread so seeded entries get sensible "Nm ago" labels.
  const anchorTs = Math.max(...msgs.map((m) => m.createdAt));

  const threadReactions = toReactions(state, thread.id);
  // Put all thread-level reactions on the primary comment — that's the
  // surface the real product uses; the demo's thread-level shape is a
  // simplification.
  const primary = messageToThreadComment(msgs[0], anchorTs, threadReactions);
  const replies = msgs.slice(1).map((m) => messageToThreadComment(m, anchorTs));

  return {
    annotationId: annotation.id,
    label: index + 1,
    colorIndex: annotation.colorIndex,
    status: thread.status satisfies AnnotationStatus,
    author: primary.author,
    date: formatTimestamp(annotation.createdAt, anchorTs),
    primary,
    replies,
    currentUser: 'You',
    active: state.selectedAnnotId === annotation.id,
    threadOpen: callbacks.threadOpen,
    onThreadToggle: callbacks.onThreadToggle,
    onActivate: callbacks.onActivate,
    onPostReply: callbacks.onPostReply,
    onCommentReact: callbacks.onCommentReact,
    onAnnotationStatusChange: callbacks.onStatusChange,
  };
}

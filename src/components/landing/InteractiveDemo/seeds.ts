import type { DemoState } from './types';

export const SEEDED_STATE: DemoState = {
  tool: 'select',
  selectedAnnotId: 'a1',
  draft: null,
  annotations: [
    {
      id: 'a1',
      threadId: 't1',
      pins: [{ id: 'p1', xPct: 8, yPct: 14 }],
      colorIndex: 0,
      createdAt: 0,
    },
    {
      id: 'a2',
      threadId: 't2',
      pins: [{ id: 'p2', xPct: 38, yPct: 36 }],
      colorIndex: 1,
      createdAt: 1,
    },
    {
      id: 'a3',
      threadId: 't3',
      pins: [{ id: 'p3', xPct: 84, yPct: 64 }],
      colorIndex: 2,
      createdAt: 2,
    },
  ],
  threads: [
    { id: 't1', annotationId: 'a1', status: 'open' },
    { id: 't2', annotationId: 'a2', status: 'needs review' },
    { id: 't3', annotationId: 'a3', status: 'resolved' },
  ],
  messages: [
    {
      id: 'm1',
      threadId: 't1',
      body: 'Headline kerning is loose. Try letter-spacing: -0.025em — the current display tracking eats the rhythm at this size.',
      author: 'you',
      createdAt: 0,
    },
    { id: 'm1r1', threadId: 't1', body: 'Agreed. Will push a fix.', author: 'agent', createdAt: 1 },
    { id: 'm1r2', threadId: 't1', body: 'Applied as v2.', author: 'agent', createdAt: 2 },
    {
      id: 'm2',
      threadId: 't2',
      body: 'Sub-copy should sit closer. 6px gap, not 10. Reads as a separate paragraph right now.',
      author: 'you',
      createdAt: 0,
    },
    {
      id: 'm2r1',
      threadId: 't2',
      body: 'Confirming the gap value before I patch.',
      author: 'agent',
      createdAt: 1,
    },
    {
      id: 'm3',
      threadId: 't3',
      body: 'CTA contrast was borderline. Pumped from #2a2a2a to #151515. AAA passes.',
      author: 'you',
      createdAt: 0,
    },
    { id: 'm3r1', threadId: 't3', body: 'Applied in v4.', author: 'agent', createdAt: 1 },
    { id: 'm3r2', threadId: 't3', body: 'Diff attached.', author: 'agent', createdAt: 2 },
    {
      id: 'm3r3',
      threadId: 't3',
      body: 'Re-tested with axe — passing.',
      author: 'agent',
      createdAt: 3,
    },
  ],
  reactions: [
    // Primary comments — same surface the v1 seeds covered.
    { messageId: 'm1', emoji: '👍', count: 3, mine: true },
    { messageId: 'm1', emoji: '🔥', count: 1, mine: false },
    { messageId: 'm2', emoji: '✅', count: 1, mine: false },
    { messageId: 'm3', emoji: '🙌', count: 2, mine: false },
    // A reply reaction so the per-message affordance is visible up front —
    // without this the demo looked like reactions only lived on the
    // primary comment.
    { messageId: 'm1r2', emoji: '🎉', count: 1, mine: false },
  ],
};

// Bumped to v2 when reactions migrated from threadId → messageId.
// Old cached state under v1 stays in localStorage harmlessly (different
// key) and gets ignored.
export const STORAGE_KEY = 'markup-demo:v2';

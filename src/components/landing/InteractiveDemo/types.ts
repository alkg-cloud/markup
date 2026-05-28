export type ColorIndex = 0 | 1 | 2 | 3 | 4;
export type ThreadStatus = 'open' | 'needs review' | 'resolved';

export type DemoPin = {
  id: string;
  // % coordinates relative to the iframe canvas
  xPct: number;
  yPct: number;
};

export type DemoAnnotation = {
  id: string;
  threadId: string;
  pins: DemoPin[];
  colorIndex: ColorIndex;
  createdAt: number;
};

export type DemoThread = {
  id: string;
  annotationId: string;
  status: ThreadStatus;
};

export type DemoMessage = {
  id: string;
  threadId: string;
  body: string;
  author: 'you' | 'agent';
  createdAt: number;
};

export type DemoReaction = {
  // Reactions are per-message, not per-thread — the real Comment renders
  // an EmojiPicker on every comment (primary AND each reply), each with
  // its own onReactionToggle. Keying by threadId would route every reply
  // reaction to the primary, which is the bug this shape prevents.
  messageId: string;
  emoji: string;
  count: number;
  mine: boolean;
};

export type DemoDraft = {
  pin: DemoPin | null;
  body: string;
};

export type ToolMode = 'select' | 'pin';

export type DemoState = {
  annotations: DemoAnnotation[];
  threads: DemoThread[];
  messages: DemoMessage[];
  reactions: DemoReaction[];
  selectedAnnotId: string | null;
  draft: DemoDraft | null;
  tool: ToolMode;
};

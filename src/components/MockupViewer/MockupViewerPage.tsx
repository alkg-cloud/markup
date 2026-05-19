import type { ThreadComment } from '@/components/AnnotationCard';
import type { BreadcrumbSegment } from '@/components/Breadcrumbs/Breadcrumbs';
import { AppMainViewerWired } from '@/components/MockupViewer/AppMainViewerWired';
import { Topbar } from '@/components/Topbar/Topbar';
import type { Anchor } from '@/lib/anchoring';
import { resolveDisplayNames } from '@/lib/auth/resolve-display-name';
import { prisma } from '@/lib/prisma';
import type { AppMainAnnotation } from './AppMainViewer';

const COLOR_PALETTE_SIZE = 16;

function parseAnchors(raw: string): Anchor[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Anchor[]) : [];
  } catch {
    return [];
  }
}

function asStatus(s: string): AppMainAnnotation['status'] {
  return s === 'needs review' || s === 'resolved' ? s : 'open';
}

function formatTimestamp(d: Date): string {
  // Match the AppMain ideias mockup format: `DD/MM/YYYY · HH:MM`.
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hour = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${day}/${month}/${year} · ${hour}:${min}`;
}

function colorForUser(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % COLOR_PALETTE_SIZE;
}

export interface MockupViewerPageProps {
  /** Database id of the mockup. Resolved upstream from the URL path. */
  mockupId: string;
  /** Logged-in user identity (used for `isOwn`, avatar). */
  identity: { kind: 'user'; userId: string } | { kind: 'agent'; tokenId: string };
  /** Pre-built breadcrumbs (caller routes know the path-based URLs). */
  breadcrumbs: BreadcrumbSegment[];
}

/**
 * Renders the mockup viewer (Topbar + AppMainViewerWired) given a
 * mockup id + caller-supplied breadcrumbs. Server component — does
 * the full data fetch + display-name resolution. Used by the path-
 * based route `/projects/[slug]/[...path]/page.tsx` when the trailing
 * segment resolves to a mockup.
 */
export async function MockupViewerPage({
  mockupId,
  identity,
  breadcrumbs,
}: MockupViewerPageProps): Promise<JSX.Element> {
  const mockup = await prisma.mockup.findUnique({
    where: { id: mockupId },
    include: {
      versions: { orderBy: { createdAt: 'desc' } },
      annotations: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          thread: {
            include: {
              messages: {
                orderBy: { createdAt: 'asc' },
                include: { reactions: true },
              },
            },
          },
        },
      },
    },
  });
  if (!mockup?.currentVersionId) {
    return <main style={{ padding: 24 }}>Mockup not found.</main>;
  }

  let userName: string | undefined;
  let userEmail: string | undefined;
  if (identity.kind === 'user') {
    const u = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { name: true, email: true },
    });
    userName = u?.name ?? undefined;
    userEmail = u?.email ?? undefined;
  }

  // Resolve every author referenced by the page (annotation authors,
  // message authors, version authors, reaction users) in one batch.
  const authorRefs = new Map<string, 'user' | 'agent'>();
  for (const v of mockup.versions) authorRefs.set(v.createdBy, v.createdByType as 'user' | 'agent');
  for (const a of mockup.annotations) {
    authorRefs.set(a.createdBy, a.createdByType as 'user' | 'agent');
    for (const m of a.thread?.messages ?? []) {
      authorRefs.set(m.authorId, m.authorType as 'user' | 'agent');
      for (const r of m.reactions) authorRefs.set(r.userId, 'user');
    }
  }
  const nameMap = await resolveDisplayNames(
    [...authorRefs.entries()].map(([createdBy, createdByType]) => ({
      createdBy,
      createdByType,
    })),
  );
  const resolvedName = (uid: string): string => nameMap.get(uid)?.name ?? `user ${uid.slice(-6)}`;

  const currentUserId = identity.kind === 'user' ? identity.userId : identity.tokenId;
  const currentUser = resolvedName(currentUserId);
  const currentUserColorIndex = colorForUser(currentUserId);

  const annotations: AppMainAnnotation[] = mockup.annotations
    .filter((a) => a.thread && a.thread.messages.length > 0)
    .map((a, idx) => {
      const messages = a.thread!.messages;
      const buildComment = (m: (typeof messages)[number]): ThreadComment => {
        const reactionsByEmoji = new Map<string, string[]>();
        for (const r of m.reactions) {
          const list = reactionsByEmoji.get(r.emoji) ?? [];
          list.push(resolvedName(r.userId));
          reactionsByEmoji.set(r.emoji, list);
        }
        return {
          id: m.id,
          author: resolvedName(m.authorId),
          authorColorIndex: colorForUser(m.authorId),
          isOwn: m.authorId === currentUserId,
          timestamp: formatTimestamp(m.createdAt),
          body: m.body,
          reactions: [...reactionsByEmoji.entries()].map(([emoji, reactedBy]) => ({
            emoji,
            reactedBy,
          })),
        };
      };
      const primary = buildComment(messages[0]);
      const replies = messages.slice(1).reverse().map(buildComment);
      return {
        id: a.id,
        threadId: a.thread!.id,
        colorIndex: a.colorIndex,
        label: mockup.annotations.length - idx,
        status: asStatus(a.status),
        author: resolvedName(a.createdBy),
        authorColorIndex: colorForUser(a.createdBy),
        date: formatTimestamp(a.createdAt),
        primary,
        replies,
        anchors: parseAnchors(a.anchors),
      };
    });

  const versions = mockup.versions.map((v, vi) => {
    const resolved = nameMap.get(v.createdBy);
    const isCurrent = v.id === mockup.currentVersionId;
    return {
      id: v.id,
      label: `v${mockup.versions.length - vi}`,
      sub: `${formatTimestamp(v.createdAt)} · ${resolved?.name ?? `${v.createdByType} ${v.createdBy.slice(-6)}`}`,
      current: isCurrent,
    };
  });

  return (
    <>
      <Topbar breadcrumbs={breadcrumbs} userName={userName} userEmail={userEmail} />
      <AppMainViewerWired
        mockupId={mockup.id}
        mockupName={mockup.name}
        mockupSrc={`/m/${mockup.id}/index.html?v=${mockup.currentVersionId}`}
        currentUser={currentUser}
        currentUserColorIndex={currentUserColorIndex}
        versions={versions}
        initialAnnotations={annotations}
      />
    </>
  );
}

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ThreadComment } from '@/components/AnnotationCard';
import { Topbar } from '@/components/Topbar/Topbar';
import type { Anchor } from '@/lib/anchoring';
import { identify } from '@/lib/auth/identify';
import { resolveDisplayNames } from '@/lib/auth/resolve-display-name';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { prisma } from '@/lib/prisma';
import { folderHref, projectDisplayName, projectHref } from '@/lib/project/routes';
import type { AppMainAnnotation } from './components/AppMainViewer';
import { AppMainViewerWired } from './components/AppMainViewerWired';

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
  // The native locale formatter inserts a comma separator we can't
  // configure, so we manually assemble the parts.
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hour = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${day}/${month}/${year} · ${hour}:${min}`;
}

function colorForUser(id: string): number {
  // Cheap deterministic hash → palette slot. Same author always gets
  // the same color across comments + avatars.
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % COLOR_PALETTE_SIZE;
}

export default async function MockupViewerPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isSetupCompleted())) redirect('/setup');
  const cs = await cookies();
  const hs = await headers();
  const fakeReq = {
    cookies: {
      get: (k: string) => {
        const c = cs.get(k);
        return c ? { value: c.value } : undefined;
      },
    },
    headers: { get: (k: string) => hs.get(k) },
  } as Parameters<typeof identify>[0];
  const id = await identify(fakeReq);
  if (!id) redirect('/login');

  const { id: mockupIdOrSlug } = await params;
  const mockup = await prisma.mockup.findFirst({
    where: /^c[a-z0-9]{24}$/.test(mockupIdOrSlug)
      ? { id: mockupIdOrSlug }
      : { slug: mockupIdOrSlug },
    include: {
      versions: { orderBy: { createdAt: 'desc' } },
      folder: {
        select: { id: true, name: true, parentId: true, projectId: true },
      },
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

  // Resolve the logged-in user's name/email for the Topbar avatar.
  let userName: string | undefined;
  let userEmail: string | undefined;
  if (id.kind === 'user') {
    const u = await prisma.user.findUnique({
      where: { id: id.userId },
      select: { name: true, email: true },
    });
    userName = u?.name ?? undefined;
    userEmail = u?.email ?? undefined;
  }

  // Walk folder.parent chain → project so the Topbar shows
  // [Project] / [Folder] / … / [Mockup].
  const breadcrumbs: { label: string; href: string }[] = [];
  if (mockup.folder) {
    const project = await prisma.project.findUnique({
      where: { id: mockup.folder.projectId },
      select: { slug: true, name: true },
    });
    if (project) {
      breadcrumbs.push({
        label: projectDisplayName(project),
        href: projectHref(project.slug),
      });
      // Build the folder ancestor chain top-down.
      const ancestors: { id: string; name: string }[] = [];
      let cur: string | null = mockup.folder.parentId;
      const seen = new Set<string>();
      while (cur && !seen.has(cur)) {
        seen.add(cur);
        const parent: { id: string; name: string; parentId: string | null } | null =
          await prisma.folder.findUnique({
            where: { id: cur },
            select: { id: true, name: true, parentId: true },
          });
        if (!parent) break;
        ancestors.unshift({ id: parent.id, name: parent.name });
        cur = parent.parentId;
      }
      // Path-based crumbs walk the same name list incrementally — each
      // ancestor links to its own cumulative folder URL.
      const pathSoFar: string[] = [];
      for (const a of ancestors) {
        pathSoFar.push(a.name);
        breadcrumbs.push({ label: a.name, href: folderHref(project.slug, [...pathSoFar]) });
      }
      pathSoFar.push(mockup.folder.name);
      breadcrumbs.push({
        label: mockup.folder.name,
        href: folderHref(project.slug, [...pathSoFar]),
      });
    }
  }
  breadcrumbs.push({ label: mockup.name, href: `/mockups/${mockup.id}` });

  // Resolve all author names in one batch (annotation authors, message
  // authors, version authors, reaction users).
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

  // The logged-in user's id for `isOwn` checks.
  const currentUserId = id.kind === 'user' ? id.userId : id.tokenId;
  const currentUser = resolvedName(currentUserId);
  const currentUserColorIndex = colorForUser(currentUserId);

  // Build the thread-comment list for each annotation. Newest-first
  // replies; primary is the first message.
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
        // Reverse-chronological list — newest annotation gets the highest
        // number. Earlier annotations bear lower numbers (more stable
        // across new creations).
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

export const dynamic = 'force-dynamic';

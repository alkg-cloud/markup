'use client';
import { usePathname, useRouter } from 'next/navigation';
/**
 * AppMainViewerWired — client wrapper that connects the AppMainViewer
 * scaffold to the live API surface (annotations, replies, reactions,
 * versions). The server component (`page.tsx`) maps Prisma data into
 * `initialAnnotations` and passes everything through.
 */
import { useCallback } from 'react';
import type { AnnotationStatus, ThreadComment } from '@/components/AnnotationCard';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast/useToast';
import type { VersionRow } from '@/components/VersionChip';
import type { Anchor } from '@/lib/anchoring';
import { appendQuery } from '@/lib/url/append-query';
import { type AppMainAnnotation, AppMainViewer } from './AppMainViewer';

export interface AppMainViewerWiredProps {
  mockupId: string;
  mockupName: string;
  mockupSrc: string;
  currentUser: string;
  currentUserColorIndex: number;
  versions: VersionRow[];
  initialAnnotations: AppMainAnnotation[];
  /** Whether the current viewer is an admin — widens delete access on annotations/comments. */
  viewerIsAdmin?: boolean;
  /** Latest / promoted version id. Used to compute historic mode. */
  currentVid: string;
  /** Viewed version id from URL `?v=<vid>`. null = current. */
  viewingVid: string | null;
}

export function AppMainViewerWired(props: AppMainViewerWiredProps) {
  // Replaces every `window.confirm`/`window.alert`/`window.prompt`
  // call in this surface. See `docs/code-style.md` "Never use native
  // browser dialogs".
  const { confirm, dialog: confirmDialog } = useConfirm();

  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  const exitHistoric = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const onCreateAnnotation = useCallback(
    async (input: {
      body: string;
      anchors: Anchor[];
      colorIndex: number;
    }): Promise<AppMainAnnotation | null> => {
      const res = await fetch(`/api/mockups/${props.mockupId}/annotations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          body: input.body,
          anchors: input.anchors,
          colorIndex: input.colorIndex,
          status: 'open',
        }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        id: string;
        threadId: string;
        colorIndex: number;
        status: AnnotationStatus;
      };
      return {
        id: json.id,
        threadId: json.threadId,
        colorIndex: json.colorIndex,
        // Newly-created annotation goes to the end of the rail — its
        // label is the new total count.
        label: props.initialAnnotations.length + 1,
        status: json.status,
        author: props.currentUser,
        authorColorIndex: props.currentUserColorIndex,
        date: new Date().toISOString(),
        primary: {
          id: `local-${Date.now()}`,
          author: props.currentUser,
          authorColorIndex: props.currentUserColorIndex,
          isOwn: true,
          timestamp: new Date().toLocaleString(),
          body: input.body,
          reactions: [],
        },
        replies: [],
        anchors: input.anchors,
      };
    },
    [
      props.mockupId,
      props.currentUser,
      props.currentUserColorIndex,
      props.initialAnnotations.length,
    ],
  );

  const onPostReply = useCallback(
    async (annotationId: string, body: string): Promise<ThreadComment | null> => {
      const annotation = props.initialAnnotations.find((a) => a.id === annotationId);
      const threadId = annotation?.threadId;
      if (!threadId) return null;
      const res = await fetch(`/api/threads/${threadId}/reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { id: string; createdAt: string };
      return {
        id: json.id,
        author: props.currentUser,
        authorColorIndex: props.currentUserColorIndex,
        isOwn: true,
        timestamp: new Date(json.createdAt).toLocaleString(),
        body,
        reactions: [],
      };
    },
    [props.initialAnnotations, props.currentUser, props.currentUserColorIndex],
  );

  const onReactionToggle = useCallback(async (commentId: string, emoji: string): Promise<void> => {
    await fetch(`/api/messages/${commentId}/reactions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emoji }),
    }).catch(() => {
      // Optimistic UI already applied; silently swallow network blips
      // — the next refresh will reconcile.
    });
  }, []);

  const onCommentEdit = useCallback(
    async (commentId: string, newBody: string): Promise<boolean> => {
      // The inline edit UI in AnnotationCard / Comment owns the textarea
      // + save/cancel buttons; this handler only persists. Returns true
      // when the PATCH succeeded so the caller can dismiss the editor +
      // apply the optimistic body swap.
      const res = await fetch(`/api/messages/${commentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: newBody }),
      });
      if (!res.ok) return false;
      return true;
    },
    [],
  );

  const onCommentDelete = useCallback(
    async (commentId: string): Promise<boolean> => {
      const ok = await confirm({
        title: 'Delete comment',
        description: 'This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return false;
      const res = await fetch(`/api/messages/${commentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const detail = await res
          .json()
          .then((j) => j?.detail ?? j?.error ?? 'Delete failed.')
          .catch(() => 'Delete failed.');
        await confirm({
          title: 'Could not delete',
          description: detail,
          confirmLabel: 'OK',
          cancelLabel: 'Dismiss',
        });
        return false;
      }
      return true;
    },
    [confirm],
  );

  const onAnnotationStatusChange = useCallback(
    async (annotationId: string, status: AnnotationStatus): Promise<boolean> => {
      const res = await fetch(`/api/annotations/${annotationId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return false;
      return true;
    },
    [],
  );

  const onAnnotationDelete = useCallback(
    async (annotationId: string): Promise<boolean> => {
      const ok = await confirm({
        title: 'Delete annotation',
        description:
          'This will remove the annotation, its thread, replies, and reactions. This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return false;
      const res = await fetch(`/api/annotations/${annotationId}`, { method: 'DELETE' });
      if (!res.ok) return false;
      return true;
    },
    [confirm],
  );

  const onVersionSelect = useCallback(
    (versionId: string) => {
      if (versionId === props.currentVid) {
        router.replace(pathname, { scroll: false });
      } else {
        router.replace(appendQuery(pathname, 'v', versionId), { scroll: false });
      }
    },
    [router, pathname, props.currentVid],
  );

  const onVersionPromote = useCallback(
    async (versionId: string) => {
      const res = await fetch(`/api/mockups/${props.mockupId}/versions/${versionId}/promote`, {
        method: 'PATCH',
      });
      if (res.ok && versionId === props.viewingVid) {
        router.replace(pathname, { scroll: false });
      }
    },
    [props.mockupId, props.viewingVid, router, pathname],
  );

  const onVersionDelete = useCallback(
    async (versionId: string) => {
      const target = props.versions.find((v) => v.id === versionId);
      const label = target?.label ?? 'this version';
      const ok = await confirm({
        title: `Delete ${label}`,
        description:
          'The version files are removed from disk and annotations still pointing at this version will lose their source-of-truth pin position. This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return;
      const res = await fetch(`/api/mockups/${props.mockupId}/versions/${versionId}`, {
        method: 'DELETE',
      });
      if (res.ok && versionId === props.viewingVid) {
        router.replace(pathname, { scroll: false });
      }
    },
    [props.mockupId, props.versions, props.viewingVid, confirm, router, pathname],
  );

  const onInvalidViewingVid = useCallback(() => {
    toast.show('Version not found — returning to current');
    router.replace(pathname, { scroll: false });
  }, [router, pathname, toast]);

  return (
    <>
      <AppMainViewer
        mockupId={props.mockupId}
        mockupSrc={props.mockupSrc}
        currentUser={props.currentUser}
        versions={props.versions}
        initialAnnotations={props.initialAnnotations}
        onCreateAnnotation={onCreateAnnotation}
        onPostReply={onPostReply}
        onReactionToggle={onReactionToggle}
        onCommentEdit={onCommentEdit}
        onCommentDelete={onCommentDelete}
        onAnnotationStatusChange={onAnnotationStatusChange}
        onAnnotationDelete={onAnnotationDelete}
        onVersionSelect={onVersionSelect}
        onVersionPromote={onVersionPromote}
        onVersionDelete={onVersionDelete}
        viewerIsAdmin={props.viewerIsAdmin}
        currentVid={props.currentVid}
        viewingVid={props.viewingVid}
        onExitHistoric={exitHistoric}
        onInvalidViewingVid={onInvalidViewingVid}
      />
      {confirmDialog}
    </>
  );
}

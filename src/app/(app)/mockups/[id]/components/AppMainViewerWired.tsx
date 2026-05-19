'use client';
/**
 * AppMainViewerWired — client wrapper that connects the AppMainViewer
 * scaffold to the live API surface (annotations, replies, reactions,
 * versions). The server component (`page.tsx`) maps Prisma data into
 * `initialAnnotations` and passes everything through.
 */
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import type { AnnotationStatus, ThreadComment } from '@/components/AnnotationCard';
import { useConfirm } from '@/components/ConfirmDialog';
import type { VersionRow } from '@/components/VersionChip';
import type { Anchor } from '@/lib/anchoring';
import { type AppMainAnnotation, AppMainViewer } from './AppMainViewer';

export interface AppMainViewerWiredProps {
  mockupId: string;
  mockupName: string;
  mockupSrc: string;
  currentUser: string;
  currentUserColorIndex: number;
  versions: VersionRow[];
  initialAnnotations: AppMainAnnotation[];
}

export function AppMainViewerWired(props: AppMainViewerWiredProps) {
  const router = useRouter();
  // Replaces every `window.confirm`/`window.alert`/`window.prompt`
  // call in this surface. See `docs/code-style.md` "Never use native
  // browser dialogs".
  const { confirm, dialog: confirmDialog } = useConfirm();

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
        status: 'open' | 'needs review' | 'resolved';
      };
      // Refresh the server component on next navigation so all derived
      // data (counts, breadcrumbs, etc.) stays consistent.
      router.refresh();
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
      router,
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
      router.refresh();
      return true;
    },
    [router],
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
      router.refresh();
      return true;
    },
    [router, confirm],
  );

  const onAnnotationStatusChange = useCallback(
    async (annotationId: string, status: AnnotationStatus): Promise<boolean> => {
      const res = await fetch(`/api/annotations/${annotationId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return false;
      router.refresh();
      return true;
    },
    [router],
  );

  const onAnnotationDelete = useCallback(
    async (annotationId: string): Promise<boolean> => {
      const ok = await confirm({
        title: 'Delete annotation',
        description: 'This will remove the annotation, its thread, replies, and reactions. This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return false;
      const res = await fetch(`/api/annotations/${annotationId}`, { method: 'DELETE' });
      if (!res.ok) return false;
      router.refresh();
      return true;
    },
    [router, confirm],
  );

  const onVersionSelect = useCallback((versionId: string) => {
    // Future: navigate to a permalink for the version. For now no-op.
    void versionId;
  }, []);

  const onVersionPromote = useCallback(
    async (versionId: string) => {
      await fetch(`/api/mockups/${props.mockupId}/versions/${versionId}/promote`, {
        method: 'PATCH',
      });
      router.refresh();
    },
    [props.mockupId, router],
  );

  const onVersionDelete = useCallback(
    async (versionId: string) => {
      await fetch(`/api/mockups/${props.mockupId}/versions/${versionId}`, {
        method: 'DELETE',
      });
      router.refresh();
    },
    [props.mockupId, router],
  );

  return (
    <>
      <AppMainViewer
        mockupId={props.mockupId}
        mockupName={props.mockupName}
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
      />
      {confirmDialog}
    </>
  );
}

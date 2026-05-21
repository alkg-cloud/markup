import type { DragTarget } from '@/hooks/useDragTarget';

/**
 * Resolves the drag-and-drop landing target from a URL pathname alone.
 *
 * Routes recognised:
 *   - `/`                              → Unsorted (no project/folder)
 *   - `/projects/<slug>`               → that project's root
 *   - `/projects/<slug>/<...path>`     → the project + every path segment
 *     as the folder breadcrumb.
 *
 * The resolver is intentionally URL-only and does NOT distinguish
 * folders vs mockup slugs in the trailing path — at drop time the user
 * can re-target inside the dialog. `projectId` and `folderId` stay
 * `null` because pathname alone can't map slugs to IDs without an
 * async lookup; the dialog's project-list fetch resolves the canonical
 * IDs and the user picks from there if the prefill is wrong.
 *
 * Shared between `(app)/layout.tsx` (drag-event resolver) and
 * `AppShell` (sidebar upload-button resolver) so a drop and a footer
 * click on the same view prefill identically.
 */
export function resolveTargetFromPath(pathname: string | null): DragTarget | null {
  if (!pathname) return null;

  if (pathname === '/' || pathname === '') {
    return {
      projectId: null,
      folderId: null,
      projectLabel: 'Unsorted',
      folderPath: [],
    };
  }

  const match = pathname.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
  if (!match) return null;

  const slug = decodeURIComponent(match[1]);
  const tail = match[2] ?? '';
  // We display the slug as the project label until the dialog's
  // project-list fetch lands the real `name` (the overlay only needs a
  // legible string; on slug pages this is usually identical or close
  // enough — e.g. `lumen-coffee` → "lumen-coffee" → user-edits-in-dialog).
  const folderPath = tail
    ? tail
        .split('/')
        .map((segment) => decodeURIComponent(segment))
        .filter((segment) => segment.length > 0)
    : [];

  return {
    projectId: null,
    folderId: null,
    projectLabel: slug,
    folderPath,
  };
}

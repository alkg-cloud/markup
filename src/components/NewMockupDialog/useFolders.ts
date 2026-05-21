'use client';

import { useEffect, useState } from 'react';
import type { FolderPickerFolder } from '@/components/FolderPicker';

/**
 * `useFolders(projectId)` — owns the per-project folder fetch for the
 * `NewMockupDialog`.
 *
 * Each time `projectId` changes the hook re-fetches
 * `/api/projects/<id>/tree`, flattens the nested folder tree into the
 * `{ id, name, parentId }` rows the `FolderPicker` expects, and exposes
 * them via `{ folders, loading }`.
 *
 * Why per-project instead of "fetch once":
 * - The project `<select>` inside the dialog lets the user re-target
 *   the upload at any other project they own. The folder tree for
 *   project B is a different list than for project A.
 *
 * Caching:
 * - Results are memoised in a module-level `Map<projectId, folders>`
 *   so re-opening the dialog (or flipping back to a previously-loaded
 *   project) is free — the cached list is returned synchronously and
 *   `loading` stays `false`.
 *
 * Cancellation:
 * - The effect creates a fresh `AbortController` on each run and aborts
 *   it in the cleanup. Fast project-switches no longer race; the
 *   stale request is aborted, and the matching `AbortError` is
 *   silently swallowed in the catch handler (same pattern as
 *   `useRequireAuth` — see `docs/frontend/data-fetching.md`).
 *
 * Returns:
 * - `folders` — the flat `FolderPickerFolder[]` for the current project,
 *   or `[]` when `projectId` is `null` / the fetch has not yet
 *   resolved.
 * - `loading` — `true` while the fetch is in flight (and false for the
 *   `null`-projectId case or a cache hit).
 */
type TreeFolder = {
  id: string;
  name: string;
  position: number;
  children: TreeFolder[];
};

type TreeResponse = {
  folders?: TreeFolder[];
};

const cache = new Map<string, FolderPickerFolder[]>();

function flattenFolders(
  folders: TreeFolder[],
  parentId: string | null = null,
): FolderPickerFolder[] {
  const out: FolderPickerFolder[] = [];
  for (const f of folders) {
    out.push({ id: f.id, name: f.name, parentId });
    if (f.children?.length) out.push(...flattenFolders(f.children, f.id));
  }
  return out;
}

export type UseFoldersResult = {
  folders: FolderPickerFolder[];
  loading: boolean;
};

export function useFolders(projectId: string | null): UseFoldersResult {
  // Seed synchronously from the cache so re-renders with a previously
  // loaded project don't flash an empty picker.
  const initial = projectId ? (cache.get(projectId) ?? null) : null;
  const [folders, setFolders] = useState<FolderPickerFolder[]>(initial ?? []);
  const [loading, setLoading] = useState<boolean>(projectId !== null && initial === null);

  useEffect(() => {
    if (projectId === null) {
      setFolders([]);
      setLoading(false);
      return;
    }
    const cached = cache.get(projectId);
    if (cached) {
      setFolders(cached);
      setLoading(false);
      return;
    }
    setFolders([]);
    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/projects/${encodeURIComponent(projectId)}/tree`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          // 401 is handled at the shell level (redirect); other failures
          // fall through to an empty list so the user can still submit.
          setLoading(false);
          return;
        }
        const json = (await res.json()) as TreeResponse;
        const flat = flattenFolders(json.folders ?? []);
        cache.set(projectId, flat);
        setFolders(flat);
        setLoading(false);
      })
      .catch((e: unknown) => {
        // AbortError is the normal teardown signal — ignore it so a
        // fast project switch doesn't flip the picker into an empty
        // "loaded" state for the stale request.
        if ((e as { name?: string } | null)?.name === 'AbortError') return;
        setLoading(false);
      });
    return () => controller.abort();
  }, [projectId]);

  return { folders, loading };
}

/** Test-only: clears the module-level folder cache. */
export function __resetFoldersCacheForTests(): void {
  cache.clear();
}

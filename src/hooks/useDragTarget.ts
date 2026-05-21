'use client';

import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * The destination a drag will land on if it drops right now. Resolved
 * by the caller (typically from `usePathname()` + a project lookup);
 * the hook is route-agnostic to keep it unit-testable.
 *
 * `null` slots mean: app-root / unsorted (no project), or project-root
 * (no folder).
 */
export type DragTarget = {
  projectId: string | null;
  folderId: string | null;
  /** Human-readable label for the overlay path preview. */
  projectLabel: string;
  /** Nested folder labels, e.g. `['Hero', 'Section']`. */
  folderPath: string[];
};

export type DropEvent = {
  files: FileList;
  target: DragTarget;
  /** `Date.now()` snapshot taken when the drop fired. */
  at: number;
};

export type DragState =
  | { isOver: false; lastDrop: DropEvent | null }
  | { isOver: true; target: DragTarget; lastDrop: DropEvent | null };

export type DragTargetActions = {
  /**
   * Returns the most recent drop event once, then nulls it out so a
   * subsequent call returns null. Used by the consumer that mounts the
   * upload dialog — we want the dialog to open exactly once per drop.
   */
  consumeDrop: () => DropEvent | null;
};

export type DragTargetProviderProps = {
  children?: ReactNode;
  /**
   * Resolves the current drag target from app state (typically the
   * route). Returning `null` disables drag detection — useful on
   * pages like `/settings` that don't accept uploads. The provider
   * calls this from `dragenter` and `drop` handlers (no memoization
   * on our side; the caller wraps it in `useCallback` if needed).
   */
  resolveTarget: () => DragTarget | null;
};

const LEAVE_DEBOUNCE_MS = 60;

const INITIAL_STATE: DragState = { isOver: false, lastDrop: null };

const StateContext = createContext<DragState>(INITIAL_STATE);
const ActionsContext = createContext<DragTargetActions>({
  consumeDrop: () => null,
});

/**
 * Owns app-wide drag state. Attaches `dragenter` / `dragover` /
 * `dragleave` / `drop` listeners on `document` at mount and removes
 * them at unmount.
 *
 * Key behaviours:
 * - Filters to file drags only (`dataTransfer.types.includes('Files')`).
 *   The sidebar's tree DnD uses `text/plain`, which we ignore so the
 *   global drop overlay never mounts during tree reorders.
 * - Debounces `dragleave` by 60 ms so the overlay survives transient
 *   leaves crossing child element boundaries (every nested element
 *   fires its own leave/enter pair as the cursor moves).
 * - Re-resolves the target on `drop` since the user may have navigated
 *   mid-drag.
 */
export function DragTargetProvider({ children, resolveTarget }: DragTargetProviderProps) {
  const [state, setState] = useState<DragState>(INITIAL_STATE);
  // We stash `lastDrop` outside state so consumers can read+clear it
  // imperatively via `consumeDrop()` without forcing a re-render
  // every time. State carries `lastDrop` too (for components that
  // want to react), and `consumeDrop` clears both.
  const lastDropRef = useRef<DropEvent | null>(null);
  // Track the current target so a drop without a resolveable target
  // (mid-navigation) still has somewhere to go — we keep the last
  // seen one rather than producing a drop with a null target.
  const lastTargetRef = useRef<DragTarget | null>(null);
  // Always read the freshest resolver on each event, even if the
  // caller forgot to memoize it — the effect only runs once at mount.
  const resolveRef = useRef(resolveTarget);
  resolveRef.current = resolveTarget;

  useEffect(() => {
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;

    const clearLeaveTimer = () => {
      if (leaveTimer !== null) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
    };

    const onDragEnter = (e: Event) => {
      const dt = (e as DragEvent).dataTransfer;
      if (!dt) return;
      // The `types` lookup is by string — every browser exposes
      // `'Files'` (capital F) when a file drag enters the page.
      if (!Array.from(dt.types).includes('Files')) return;
      const target = resolveRef.current();
      if (!target) return;
      lastTargetRef.current = target;
      clearLeaveTimer();
      setState((prev) => ({
        isOver: true,
        target,
        lastDrop: prev.lastDrop,
      }));
    };

    const onDragOver = (e: Event) => {
      // The browser cancels a drop unless `dragover` is
      // `preventDefault`'d. We do it unconditionally for file drags
      // so the cursor stays in copy mode.
      const dt = (e as DragEvent).dataTransfer;
      if (!dt || !Array.from(dt.types).includes('Files')) return;
      e.preventDefault();
    };

    const onDragLeave = (e: Event) => {
      const dt = (e as DragEvent).dataTransfer;
      if (!dt || !Array.from(dt.types).includes('Files')) return;
      // Schedule the flip; a re-enter within the window cancels it.
      clearLeaveTimer();
      leaveTimer = setTimeout(() => {
        leaveTimer = null;
        setState((prev) => ({ isOver: false, lastDrop: prev.lastDrop }));
      }, LEAVE_DEBOUNCE_MS);
    };

    const onDrop = (e: Event) => {
      const dt = (e as DragEvent).dataTransfer;
      if (!dt || !Array.from(dt.types).includes('Files')) return;
      e.preventDefault();
      clearLeaveTimer();
      const target = resolveRef.current() ?? lastTargetRef.current;
      if (!target) {
        // No target at all — drop ignored. Reset overlay.
        setState((prev) => ({ isOver: false, lastDrop: prev.lastDrop }));
        return;
      }
      const dropEvent: DropEvent = {
        files: dt.files,
        target,
        at: Date.now(),
      };
      lastDropRef.current = dropEvent;
      setState({ isOver: false, lastDrop: dropEvent });
    };

    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('drop', onDrop);

    return () => {
      clearLeaveTimer();
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('drop', onDrop);
    };
  }, []);

  const consumeDrop = useCallback((): DropEvent | null => {
    const dropEvent = lastDropRef.current;
    if (dropEvent === null) return null;
    lastDropRef.current = null;
    // Clear the state slot too so components watching `lastDrop` see
    // it disappear. (Most consumers will use the imperative API; this
    // keeps the two paths consistent.)
    setState((prev) =>
      prev.isOver
        ? { isOver: true, target: prev.target, lastDrop: null }
        : { isOver: false, lastDrop: null },
    );
    return dropEvent;
  }, []);

  const actions = useMemo<DragTargetActions>(() => ({ consumeDrop }), [consumeDrop]);

  return createElement(
    StateContext.Provider,
    { value: state },
    createElement(ActionsContext.Provider, { value: actions }, children),
  );
}

/** Read the live drag state. Subscribes to provider updates. */
export function useDragTarget(): DragState {
  return useContext(StateContext);
}

/** Imperative actions — currently just `consumeDrop()`. */
export function useDragTargetActions(): DragTargetActions {
  return useContext(ActionsContext);
}

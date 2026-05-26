import { useEffect } from 'react';
import type { DraftState } from '@/components/MockupViewer/draft-types';
import { useIsMac } from '@/lib/shortcuts/platform';

export interface UseDraftKeyboardArgs {
  draft: DraftState;
  onOpen: () => void;
  onCancel: () => void;
  onSend: () => void;
  onSave: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /**
   * Optional iframe ref. When provided, the same keydown handler is also
   * attached to the iframe's `contentDocument` so the `N` shortcut works
   * even when focus has moved into the mockup canvas (same-origin iframe
   * served by `/m/[mockupId]/...`). Iframe events that bubble to the
   * iframe's document aren't seen by the parent document by default; we
   * bridge them explicitly.
   */
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  /**
   * When true, the hook does not attach any keydown listener — used by
   * read-only modes (e.g. historic version viewing) to disable the N /
   * Esc / ⌘Enter / ⌘S shortcuts.
   */
  disabled?: boolean;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}

export function useDraftKeyboard(args: UseDraftKeyboardArgs): void {
  const { draft, onOpen, onCancel, onSend, onSave, textareaRef, iframeRef, disabled } = args;
  const isMac = useIsMac();

  useEffect(() => {
    if (disabled) return;
    function onKey(e: KeyboardEvent) {
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // N — open a new draft when no input is focused
      if (
        (e.key === 'n' || e.key === 'N') &&
        !mod &&
        !e.shiftKey &&
        !e.altKey &&
        !isInputFocused()
      ) {
        e.preventDefault();
        onOpen();
        return;
      }

      // Esc — cancel when textarea is focused (or focus within DraftCard)
      if (e.key === 'Escape' && draft) {
        const focusInDraft =
          textareaRef.current && document.activeElement
            ? textareaRef.current.contains(document.activeElement as Node) ||
              (document.activeElement as HTMLElement).closest?.('[data-draft-card-root]') !== null
            : false;
        if (focusInDraft) {
          e.preventDefault();
          onCancel();
          return;
        }
      }

      // ⌘/Ctrl + Enter — send
      if (
        mod &&
        e.key === 'Enter' &&
        draft &&
        textareaRef.current &&
        document.activeElement === textareaRef.current
      ) {
        e.preventDefault();
        onSend();
        return;
      }

      // ⌘/Ctrl + S — save (preventDefault)
      if (
        mod &&
        (e.key === 's' || e.key === 'S') &&
        draft &&
        textareaRef.current &&
        document.activeElement === textareaRef.current
      ) {
        e.preventDefault();
        onSave();
        return;
      }
    }
    document.addEventListener('keydown', onKey);

    // Bridge: also listen inside the iframe's document so shortcuts fire
    // when the user's focus is on the mockup canvas (same-origin only —
    // accessing contentDocument on a cross-origin frame throws). Re-attach
    // on each iframe load so the listener follows version-switches.
    const iframe = iframeRef?.current ?? null;
    let cleanupIframe: (() => void) | null = null;
    function attachIframeListener() {
      if (!iframe) return;
      let doc: Document | null = null;
      try {
        doc = iframe.contentDocument;
      } catch {
        // Cross-origin iframe — nothing to do; default browser behavior.
        return;
      }
      if (!doc) return;
      doc.addEventListener('keydown', onKey);
      cleanupIframe = () => {
        try {
          doc?.removeEventListener('keydown', onKey);
        } catch {
          // Iframe detached — listener is gone with it.
        }
      };
    }
    attachIframeListener();
    iframe?.addEventListener('load', attachIframeListener);

    return () => {
      document.removeEventListener('keydown', onKey);
      cleanupIframe?.();
      iframe?.removeEventListener('load', attachIframeListener);
    };
  }, [draft, isMac, onOpen, onCancel, onSend, onSave, textareaRef, iframeRef, disabled]);
}

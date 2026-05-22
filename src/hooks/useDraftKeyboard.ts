import { useEffect } from 'react';
import { useIsMac } from '@/lib/shortcuts/platform';
import type { DraftState } from '@/components/MockupViewer/draft-types';

export interface UseDraftKeyboardArgs {
  draft: DraftState;
  onOpen: () => void;
  onCancel: () => void;
  onSend: () => void;
  onSave: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
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
  const { draft, onOpen, onCancel, onSend, onSave, textareaRef } = args;
  const isMac = useIsMac();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // N — open a new draft when no input is focused
      if ((e.key === 'n' || e.key === 'N') && !mod && !e.shiftKey && !e.altKey && !isInputFocused()) {
        e.preventDefault();
        onOpen();
        return;
      }

      // Esc — cancel when textarea is focused (or focus within DraftCard)
      if (e.key === 'Escape' && draft) {
        const focusInDraft = textareaRef.current && document.activeElement
          ? textareaRef.current.contains(document.activeElement as Node) ||
            ((document.activeElement as HTMLElement).closest?.('[data-draft-card-root]') !== null)
          : false;
        if (focusInDraft) {
          e.preventDefault();
          onCancel();
          return;
        }
      }

      // ⌘/Ctrl + Enter — send
      if (mod && e.key === 'Enter' && draft && textareaRef.current && document.activeElement === textareaRef.current) {
        e.preventDefault();
        onSend();
        return;
      }

      // ⌘/Ctrl + S — save (preventDefault)
      if (mod && (e.key === 's' || e.key === 'S') && draft && textareaRef.current && document.activeElement === textareaRef.current) {
        e.preventDefault();
        onSave();
        return;
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [draft, isMac, onOpen, onCancel, onSend, onSave, textareaRef]);
}

/**
 * Build an anchor from a click on the mockup canvas.
 *
 * Strategy (per `docs/superpowers/specs/2026-05-18-pin-anchoring-strategy.md`):
 *
 * 1. Try `caretRangeFromPoint(cx,cy)` (Chromium) / `caretPositionFromPoint`
 *    (Firefox) to get a text-node + offset under the cursor.
 * 2. If the caret hits a Text node descended from the canvas root AND
 *    the click coordinate is INSIDE that character's rendered rect,
 *    return a text-anchor with sub-coordinates inside the char rect.
 * 3. Otherwise fall back to an element-anchor on `target` (the natural
 *    event recipient), using fractional offsets inside its bbox.
 *
 * Returns `null` if `target` is not contained within `canvasRoot`.
 */
import { buildAnchorPath } from './path';
import { type Anchor, getCharRect } from './reposition';
import { getCharOffsetInElement } from './text';

type CaretPositionLike = { offsetNode: Node; offset: number };

type CaretFromPointDoc = Document & {
  caretPositionFromPoint?: (x: number, y: number) => CaretPositionLike | null;
};

export interface ClickAnchorInput {
  canvasRoot: Element;
  target: Element;
  clientX: number;
  clientY: number;
}

export function buildAnchorFromClick(input: ClickAnchorInput): Anchor | null {
  const { canvasRoot, target, clientX, clientY } = input;
  if (!canvasRoot.contains(target)) return null;

  const doc = canvasRoot.ownerDocument as CaretFromPointDoc | null;
  if (doc) {
    let caretNode: Node | null = null;
    let caretOffset = 0;

    // Chromium path
    const cR = (doc as Document).caretRangeFromPoint?.(clientX, clientY);
    if (cR) {
      caretNode = cR.startContainer;
      caretOffset = cR.startOffset;
    } else if (typeof doc.caretPositionFromPoint === 'function') {
      // Firefox path
      const cP = doc.caretPositionFromPoint(clientX, clientY) as CaretPositionLike | null;
      if (cP) {
        caretNode = cP.offsetNode;
        caretOffset = cP.offset;
      }
    }

    if (caretNode && caretNode.nodeType === Node.TEXT_NODE) {
      const textNode = caretNode as Text;
      const textParent = textNode.parentElement;
      if (textParent && canvasRoot.contains(textParent)) {
        const rect = getCharRect(textNode, caretOffset);
        // Reject the snap if the click was outside the character rect —
        // happens when clicking padding/margin near a text node.
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          const charOffset = getCharOffsetInElement(textParent, textNode, caretOffset);
          if (charOffset >= 0) {
            const path = buildAnchorPath(canvasRoot, textParent);
            if (path !== null) {
              const subX = (clientX - rect.left) / rect.width;
              const subY = (clientY - rect.top) / rect.height;
              return { path, textOffset: charOffset, subX, subY };
            }
          }
        }
      }
    }
  }

  // Element-anchor fallback.
  const elRect = target.getBoundingClientRect();
  const path = buildAnchorPath(canvasRoot, target);
  if (path === null) return null;
  const offsetX = elRect.width > 0 ? (clientX - elRect.left) / elRect.width : 0.5;
  const offsetY = elRect.height > 0 ? (clientY - elRect.top) / elRect.height : 0.5;
  return { path, offsetX, offsetY };
}

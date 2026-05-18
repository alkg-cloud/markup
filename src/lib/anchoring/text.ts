/**
 * Pin anchoring — text-node offset utilities.
 *
 * Converts between an absolute char offset within an element's combined
 * `textContent` and the underlying `{textNode, offsetInNode}` pair. The
 * combined offset is what gets persisted on a pin so that nested inline
 * structure (<em>, <strong>, <br>, etc.) doesn't fragment the address.
 *
 * See `docs/superpowers/specs/2026-05-18-pin-anchoring-strategy.md` §
 * "Text offset within an element".
 */

export interface CharPosition {
  node: Text;
  /** Local offset inside `node` (0..node.length). */
  offset: number;
}

/**
 * Sum char lengths of every descendant text node of `root` up to
 * (and including) `offsetInNode` chars into `textNode`. Returns -1 if
 * `textNode` is not a descendant of `root`.
 */
export function getCharOffsetInElement(
  root: Element,
  textNode: Node,
  offsetInNode: number,
): number {
  let count = 0;
  const walker = (root.ownerDocument ?? document).createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    if (n === textNode) return count + offsetInNode;
    count += (n.nodeValue ?? '').length;
  }
  return -1;
}

/**
 * Inverse of `getCharOffsetInElement`. Given a char offset within
 * `root`'s combined textContent, locate `{textNode, offset}`.
 *
 * Out-of-bounds offsets clamp to the last text node's end. Returns null
 * only when `root` has no text node descendants at all.
 */
export function findCharPositionInElement(root: Element, charOffset: number): CharPosition | null {
  let count = 0;
  const walker = (root.ownerDocument ?? document).createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    last = n as Text;
    const len = (n.nodeValue ?? '').length;
    if (count + len >= charOffset) {
      return { node: last, offset: charOffset - count };
    }
    count += len;
  }
  if (last) return { node: last, offset: (last.nodeValue ?? '').length };
  return null;
}

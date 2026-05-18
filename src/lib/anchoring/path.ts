/**
 * Pin anchoring — CSS path utilities.
 *
 * Builds and resolves stable CSS paths for arbitrary elements inside a
 * canvas root (typically `.mockup-doc`). Paths use `:scope > ` prefix
 * plus direct-child combinators only, with `tag:nth-of-type(N)` at each
 * level when siblings of the same tag exist. This makes the resolved
 * element deterministic — without the prefix, `mockupDoc.querySelector('div>div')`
 * would return the first descendant div with a div parent (often the
 * wrong element).
 *
 * See `docs/superpowers/specs/2026-05-18-pin-anchoring-strategy.md` §
 * "CSS path construction".
 */

/**
 * Walk from `target` up to (but not including) `root`, building a
 * `:scope`-relative CSS path. Returns `null` if `target` is the root,
 * null, or not contained within `root`.
 */
export function buildAnchorPath(root: Element, target: Element | null): string | null {
  if (!target || target === root || !root.contains(target)) return null;

  const parts: string[] = [];
  let node: Element | null = target;
  while (node && node !== root) {
    const parent: Element | null = node.parentElement;
    if (!parent) break;
    const tag = node.tagName.toLowerCase();
    const siblingsSameTag = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
    const idx = siblingsSameTag.indexOf(node);
    parts.unshift(siblingsSameTag.length > 1 ? `${tag}:nth-of-type(${idx + 1})` : tag);
    node = parent;
  }
  return `:scope>${parts.join('>')}`;
}

/**
 * Resolve a path previously built by `buildAnchorPath` back to its
 * element inside `root`. Empty/nullish path → returns root (canvas
 * background click). Invalid selector → returns null without throwing.
 */
export function resolveAnchor(root: Element, path: string | null | undefined): Element | null {
  if (!path) return root;
  try {
    return root.querySelector(path);
  } catch {
    return null;
  }
}

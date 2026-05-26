/**
 * Appends `key=value` to `url`. Uses `?` when no query exists, `&` otherwise.
 * Preserves any trailing `#hash` (inserts the pair before it).
 * `url` must be a valid relative or absolute URL; degenerate inputs
 * (e.g. a bare `'?'`) are not guarded.
 */
export function appendQuery(url: string, key: string, value: string): string {
  const hashIdx = url.indexOf('#');
  const base = hashIdx === -1 ? url : url.slice(0, hashIdx);
  const hash = hashIdx === -1 ? '' : url.slice(hashIdx);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}${hash}`;
}

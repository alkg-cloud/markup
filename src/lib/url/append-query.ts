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

/**
 * Sets `key=value` on `url`, replacing any existing occurrence of `key` in
 * the query string (and deduplicating if `key` appears more than once).
 * Preserves any trailing `#hash` and the order of unrelated params.
 * Use this when the URL may already carry the same key (e.g. a cache-busting
 * `?v=<vid>` you want to override). For pure append, use `appendQuery`.
 */
export function setQuery(url: string, key: string, value: string): string {
  const hashIdx = url.indexOf('#');
  const base = hashIdx === -1 ? url : url.slice(0, hashIdx);
  const hash = hashIdx === -1 ? '' : url.slice(hashIdx);
  const qIdx = base.indexOf('?');
  const path = qIdx === -1 ? base : base.slice(0, qIdx);
  const query = qIdx === -1 ? '' : base.slice(qIdx + 1);
  const encodedKey = encodeURIComponent(key);
  const kept = query
    .split('&')
    .filter((pair) => pair.length > 0 && pair.split('=')[0] !== encodedKey);
  kept.push(`${encodedKey}=${encodeURIComponent(value)}`);
  return `${path}?${kept.join('&')}${hash}`;
}

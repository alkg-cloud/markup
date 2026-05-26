export function appendQuery(src: string, key: string, value: string): string {
  const hashIdx = src.indexOf('#');
  const base = hashIdx === -1 ? src : src.slice(0, hashIdx);
  const hash = hashIdx === -1 ? '' : src.slice(hashIdx);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}${hash}`;
}

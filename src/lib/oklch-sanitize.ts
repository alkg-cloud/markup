const OKLCH_RE = /oklch\([^)]+\)/g;

export function stripOklch(value: string): string {
  return value.replace(OKLCH_RE, 'rgba(0,0,0,0)');
}

export function sanitizeOklchInDocument(doc: Document): void {
  for (const style of doc.querySelectorAll('style')) {
    if (style.textContent?.includes('oklch')) {
      style.textContent = stripOklch(style.textContent);
    }
  }
  for (const el of doc.querySelectorAll('[style]')) {
    const raw = el.getAttribute('style');
    if (raw?.includes('oklch')) {
      el.setAttribute('style', stripOklch(raw));
    }
  }
}

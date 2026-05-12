const OKLCH_RE = /oklch\([^)]+\)/g;

export function stripOklch(value: string): string {
  return value.replace(OKLCH_RE, 'rgba(0,0,0,0)');
}

const COLOR_PROPS = [
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'column-rule-color',
  'flood-color',
  'lighting-color',
  'stop-color',
  'box-shadow',
  'text-shadow',
  'background',
  'background-image',
] as const;

export function sanitizeOklchInDocument(doc: Document): void {
  for (const el of doc.querySelectorAll('*')) {
    const htmlEl = el as HTMLElement;
    const cs = doc.defaultView?.getComputedStyle(htmlEl);
    if (!cs) continue;
    for (const prop of COLOR_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (val?.includes('oklch')) {
        htmlEl.style.setProperty(prop, stripOklch(val));
      }
    }
  }
}

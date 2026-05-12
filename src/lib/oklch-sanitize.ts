const OKLCH_RE = /oklch\((?:[^()]*|\([^()]*\))*\)/g;

function oklchToFallback(match: string): string {
  const inner = match.slice(6, -1);
  const slashIdx = inner.indexOf('/');
  const colorPart = slashIdx !== -1 ? inner.slice(0, slashIdx) : inner;
  const alphaPart = slashIdx !== -1 ? inner.slice(slashIdx + 1).trim() : null;

  const firstToken = colorPart.trim().split(/[\s,]+/)[0];
  let lightness = Number.parseFloat(firstToken);
  if (Number.isNaN(lightness)) return '#808080';
  if (firstToken.includes('%')) lightness /= 100;
  lightness = Math.max(0, Math.min(1, lightness));

  const g = Math.round(lightness * 255);

  if (alphaPart) {
    let alpha = Number.parseFloat(alphaPart);
    if (Number.isNaN(alpha)) alpha = 1;
    if (alpha > 1) alpha /= 100;
    return `rgba(${g},${g},${g},${alpha})`;
  }
  return `rgb(${g},${g},${g})`;
}

export function stripOklch(value: string): string {
  return value.replace(OKLCH_RE, oklchToFallback);
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
  for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
    try {
      const href = link.getAttribute('href');
      if (!href) continue;
      for (const sheet of doc.styleSheets) {
        if (!sheet.href?.includes(href)) continue;
        const rules = Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join('\n');
        if (!rules.includes('oklch')) break;
        const inlined = doc.createElement('style');
        inlined.textContent = stripOklch(rules);
        link.replaceWith(inlined);
        break;
      }
    } catch {
      // CORS or security error reading cssRules — skip
    }
  }
}

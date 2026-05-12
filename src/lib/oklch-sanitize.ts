const OKLCH_RE = /oklch\((?:[^()]*|\([^()]*\))*\)/g;

function gammaEncode(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(gammaEncode(v) * 255)));
  return [clamp(rLin), clamp(gLin), clamp(bLin)];
}

function oklchToFallback(match: string): string {
  const inner = match.slice(6, -1);
  const slashIdx = inner.indexOf('/');
  const colorPart = slashIdx !== -1 ? inner.slice(0, slashIdx) : inner;
  const alphaPart = slashIdx !== -1 ? inner.slice(slashIdx + 1).trim() : null;

  const tokens = colorPart.trim().split(/[\s,]+/);
  let L = Number.parseFloat(tokens[0]);
  if (Number.isNaN(L)) return '#808080';
  if (tokens[0].includes('%')) L /= 100;
  L = Math.max(0, Math.min(1, L));

  const C = Number.parseFloat(tokens[1]) || 0;
  const H = Number.parseFloat(tokens[2]) || 0;

  const [r, g, b] = oklchToRgb(L, C, H);

  if (alphaPart) {
    let alpha = Number.parseFloat(alphaPart);
    if (Number.isNaN(alpha)) alpha = 1;
    if (alpha > 1) alpha /= 100;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgb(${r},${g},${b})`;
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

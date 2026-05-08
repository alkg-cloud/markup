export type Drawing =
  | { kind: 'arrow'; from: [number, number]; to: [number, number] }
  | {
      kind: 'geo';
      geo: string; // 'rectangle' | 'ellipse' | 'oval' | etc.
      color: string;
      fill: string;
      bbox: [number, number, number, number];
      text: string;
    }
  | { kind: 'text'; content: string; bbox: [number, number, number, number] }
  | { kind: 'draw'; bbox: [number, number, number, number] };

function extractRichText(rt: unknown): string {
  if (typeof rt === 'string') return rt;
  if (!rt || typeof rt !== 'object') return '';
  const json = JSON.stringify(rt);
  const matches = [...json.matchAll(/"text"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  return matches.join(' ');
}

function getStore(snapshot: unknown): Record<string, unknown> | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const s = snapshot as { document?: { store?: unknown }; store?: unknown };
  if (s.document?.store && typeof s.document.store === 'object') {
    return s.document.store as Record<string, unknown>;
  }
  if (s.store && typeof s.store === 'object') {
    return s.store as Record<string, unknown>;
  }
  return null;
}

export function extractDrawings(snapshot: unknown): Drawing[] {
  const store = getStore(snapshot);
  if (!store) return [];
  const out: Drawing[] = [];
  for (const raw of Object.values(store)) {
    if (!raw || typeof raw !== 'object') continue;
    const v = raw as Record<string, unknown>;
    if (v.typeName !== 'shape') continue;
    const t = v.type as string | undefined;
    const props = (v.props ?? {}) as Record<string, unknown>;
    const x = Number(v.x ?? 0);
    const y = Number(v.y ?? 0);
    if (t === 'arrow') {
      const s = (props.start ?? {}) as Record<string, unknown>;
      const e = (props.end ?? {}) as Record<string, unknown>;
      out.push({
        kind: 'arrow',
        from: [x + Number(s.x ?? 0), y + Number(s.y ?? 0)],
        to: [x + Number(e.x ?? 0), y + Number(e.y ?? 0)],
      });
    } else if (t === 'geo') {
      const geo = String(props.geo ?? 'rectangle');
      const w = Number(props.w ?? 0);
      const h = Number(props.h ?? 0);
      out.push({
        kind: 'geo',
        geo,
        color: String(props.color ?? 'black'),
        fill: String(props.fill ?? 'none'),
        bbox: [x, y, w, h],
        text: extractRichText(props.richText ?? props.text),
      });
    } else if (t === 'text') {
      out.push({
        kind: 'text',
        content: extractRichText(props.richText ?? props.text),
        bbox: [x, y, Number(props.w ?? 0), Number(props.h ?? 0)],
      });
    } else if (t === 'draw') {
      out.push({ kind: 'draw', bbox: [x, y, 0, 0] });
    }
    // skip image, line, frame, group, note etc.
  }
  return out;
}

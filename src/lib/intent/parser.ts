export type Drawing =
  | { kind: 'arrow'; from: [number, number]; to: [number, number] }
  | {
      kind: 'rectangle' | 'ellipse' | 'oval' | 'diamond' | 'star' | 'triangle' | string;
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

function getStore(snapshot: any): Record<string, any> | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  if (snapshot.document?.store) return snapshot.document.store;
  if (snapshot.store) return snapshot.store;
  return null;
}

export function extractDrawings(snapshot: unknown): Drawing[] {
  const store = getStore(snapshot);
  if (!store) return [];
  const out: Drawing[] = [];
  for (const v of Object.values(store)) {
    if (!v || typeof v !== 'object') continue;
    if ((v as any).typeName !== 'shape') continue;
    const t = (v as any).type;
    const props = (v as any).props ?? {};
    const x = Number((v as any).x ?? 0);
    const y = Number((v as any).y ?? 0);
    if (t === 'arrow') {
      const s = props.start ?? {};
      const e = props.end ?? {};
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
        kind: geo,
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

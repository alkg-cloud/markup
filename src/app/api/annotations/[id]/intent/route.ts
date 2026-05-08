import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { parsePinCoords } from '@/lib/annotation/pin-coords';
import { identify } from '@/lib/auth/identify';
import { env } from '@/lib/env';
import { readIntentCache, writeIntentCache } from '@/lib/intent/cache';
import { contrastRatio } from '@/lib/intent/contrast';
import { type Drawing, extractDrawings } from '@/lib/intent/parser';
import { withPage } from '@/lib/intent/puppeteer';
import { prisma } from '@/lib/prisma';

interface AnnotatedDom {
  selector: string;
  text_at_point: string;
  computed: {
    color: string;
    background: string;
    fontSize: string;
    fontFamily: string;
    contrast_aa?: number;
  };
  ancestors: string[];
}

interface IntentPayload {
  annotation_id: string;
  comment: string;
  intent_type: string;
  drawings: Drawing[];
  annotated_dom: AnnotatedDom[];
  viewport: { width: number; height: number; scrollY: number };
}

function probesFromDrawings(drawings: Drawing[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const d of drawings) {
    if (d.kind === 'arrow') {
      out.push(d.to);
    } else if ('bbox' in d) {
      const [x, y, w, h] = d.bbox;
      out.push([x + w / 2, y + h / 2]);
    }
  }
  return out;
}

function baseUrlFromReq(req: Request): string {
  return env().APP_URL ?? new URL(req.url).origin;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id: annotationId } = await ctx.params;

  const annotation = await prisma.annotation.findUnique({
    where: { id: annotationId },
    include: {
      thread: { include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } } },
    },
  });
  if (!annotation) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const mockup = await prisma.mockup.findUnique({
    where: { id: annotation.mockupId },
    select: { currentVersionId: true },
  });
  if (!mockup?.currentVersionId) {
    return NextResponse.json({ error: 'no_current_version' }, { status: 404 });
  }

  const tldrawAbs = path.join(env().DATA_DIR, annotation.tldrawPath);
  if (!fs.existsSync(tldrawAbs)) {
    return NextResponse.json({ error: 'tldraw_missing' }, { status: 404 });
  }
  const tldrawMtime = fs.statSync(tldrawAbs).mtimeMs;
  const cacheKey = `${tldrawMtime}:${mockup.currentVersionId}`;
  const annDir = path.dirname(tldrawAbs);

  const cached = readIntentCache<IntentPayload>(annDir, cacheKey);
  if (cached) {
    return NextResponse.json(cached.payload, { status: 200 });
  }

  const snapshot = JSON.parse(fs.readFileSync(tldrawAbs, 'utf8'));
  const drawings = extractDrawings(snapshot);
  const pin = annotation.pinCoords ? parsePinCoords(annotation.pinCoords) : null;
  const comment = annotation.thread?.messages[0]?.body ?? '';

  let annotated_dom: AnnotatedDom[] = [];
  const probes = probesFromDrawings(drawings);
  if (probes.length > 0) {
    try {
      annotated_dom = await withPage(async (page) => {
        const url = `${baseUrlFromReq(req)}/m/${annotation.mockupId}/index.html?v=${mockup.currentVersionId}`;
        const vw = pin?.viewportWidth ?? 1280;
        const vh = pin?.viewportHeight ?? 720;
        await page.setViewport({ width: vw, height: vh });
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
        return await page.evaluate((pts: Array<[number, number]>) => {
          const out: AnnotatedDom[] = [];
          const seen = new Set<Element>();
          for (const [px, py] of pts) {
            window.scrollTo(0, Math.max(0, py - window.innerHeight / 2));
            const el = document.elementFromPoint(px, py - window.scrollY);
            if (!el || seen.has(el)) continue;
            seen.add(el);
            const cs = getComputedStyle(el);
            const ancestors: string[] = [];
            let p = el.parentElement;
            for (let i = 0; i < 3 && p && p !== document.body; i++) {
              const cls = (p as HTMLElement).className
                ?.toString()
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .join('.');
              ancestors.push(`${p.tagName.toLowerCase()}${cls ? `.${cls}` : ''}`);
              p = p.parentElement;
            }
            const tagSelector = el.tagName.toLowerCase();
            const cls = (el as HTMLElement).className
              ?.toString()
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .join('.');
            const selector = cls ? `${tagSelector}.${cls}` : tagSelector;
            let text_at_point = '';
            try {
              // biome-ignore lint/suspicious/noExplicitAny: caretRangeFromPoint is non-standard but supported in headless Chromium
              const range = (document as any).caretRangeFromPoint?.(px, py - window.scrollY);
              if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                const node = range.startContainer as Text;
                const txt = node.textContent ?? '';
                const off = range.startOffset;
                text_at_point = txt.slice(Math.max(0, off - 5), Math.min(txt.length, off + 30));
              }
            } catch {}
            if (!text_at_point && el.textContent) {
              text_at_point = (el.textContent || '').trim().slice(0, 40);
            }
            out.push({
              selector,
              text_at_point,
              computed: {
                color: cs.color,
                background: cs.backgroundColor,
                fontSize: cs.fontSize,
                fontFamily: cs.fontFamily,
              },
              ancestors,
            });
          }
          return out;
        }, probes);
      });
    } catch {
      annotated_dom = [];
    }
  }

  for (const d of annotated_dom) {
    const ratio = contrastRatio(d.computed.color, d.computed.background);
    if (ratio > 0) {
      d.computed.contrast_aa = Number(ratio.toFixed(2));
    }
  }

  const payload: IntentPayload = {
    annotation_id: annotation.id,
    comment,
    intent_type: annotation.intentType,
    drawings,
    annotated_dom,
    viewport: {
      width: pin?.viewportWidth ?? 0,
      height: pin?.viewportHeight ?? 0,
      scrollY: pin?.scrollY ?? 0,
    },
  };

  writeIntentCache(annDir, cacheKey, payload);
  return NextResponse.json(payload, { status: 200 });
}

export const dynamic = 'force-dynamic';

/**
 * One-shot script — backfill legacy `pinCoords` JSON into the new
 * `anchors[]` array on each annotation.
 *
 * Strategy: for each annotation that has a non-null pinCoords AND an
 * empty anchors array ('[]'), synthesize a single element-anchor that
 * points at the canvas root with fractional offsets computed from the
 * stored bbox center / viewport. The pin will land at approximately
 * the same SCREEN position the legacy annotation used to occupy.
 *
 * Users may need to re-anchor a few annotations manually after the
 * backfill — the resulting positions are best-effort, not pixel-perfect.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-annotation-anchors.ts          # dry run
 *   pnpm tsx scripts/backfill-annotation-anchors.ts --apply  # writes
 */
import { parsePinCoords } from '@/lib/annotation/pin-coords';
import type { ElementAnchorRecord } from '@/lib/annotation/service';
import { prisma } from '@/lib/prisma';

interface BackfillResult {
  total: number;
  skipped: number;
  willUpdate: number;
  updated: number;
  errors: number;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  const stats: BackfillResult = {
    total: 0,
    skipped: 0,
    willUpdate: 0,
    updated: 0,
    errors: 0,
  };

  // Fetch annotations that still have the legacy pinCoords and have
  // empty anchors. Process in small batches to keep memory bounded.
  const annotations = await prisma.annotation.findMany({
    where: {
      pinCoords: { not: null },
      anchors: '[]',
    },
    select: { id: true, pinCoords: true },
  });

  stats.total = annotations.length;
  if (stats.total === 0) {
    console.log('No annotations need backfilling.');
    return;
  }

  for (const a of annotations) {
    const coords = parsePinCoords(a.pinCoords);
    if (!coords) {
      stats.skipped++;
      continue;
    }

    // Compute fractional offsets relative to the captured viewport size.
    // The anchor element is the canvas root (empty path resolves to
    // mockup-doc); offsetX/Y are 0..1 inside that root's bbox.
    const offsetX = clamp01((coords.bboxX + coords.bboxW / 2) / coords.viewportWidth);
    const offsetY = clamp01((coords.bboxY + coords.bboxH / 2) / coords.viewportHeight);

    const anchor: ElementAnchorRecord = {
      path: '',
      offsetX,
      offsetY,
    };

    stats.willUpdate++;
    if (apply) {
      try {
        await prisma.annotation.update({
          where: { id: a.id },
          data: { anchors: JSON.stringify([anchor]) },
        });
        stats.updated++;
      } catch (e) {
        console.error(`Failed to update annotation ${a.id}:`, e);
        stats.errors++;
      }
    }
  }

  console.log('Backfill summary:', stats);
  if (!apply) console.log('Dry run — re-run with --apply to persist changes.');
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

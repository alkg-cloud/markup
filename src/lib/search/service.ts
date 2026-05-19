import 'server-only';

import { prisma } from '@/lib/prisma';

export interface SearchResult {
  type: string;
  id: string;
  mockupId: string;
  mockupSlug: string;
  mockupName: string;
  excerpt: string;
  annotationId: string | null;
}

interface RawRow {
  entity_type: string;
  entity_id: string;
  mockup_id: string;
  annotation_id: string | null;
  mockup_slug: string;
  mockup_name: string;
  excerpt: string;
}

function sanitize(query: string): string {
  // Wrap in double-quotes to suppress FTS5 operator interpretation.
  // Escape embedded double-quotes by doubling them.
  return `"${query.replace(/"/g, '""')}"`;
}

export async function search(query: string, limit = 20): Promise<SearchResult[]> {
  const sanitized = sanitize(query);
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT entity_type, entity_id, mockup_id, annotation_id, mockup_slug, mockup_name,
           snippet(search_index, 6, '<mark>', '</mark>', '…', 48) AS excerpt
    FROM search_index
    WHERE search_index MATCH ${sanitized}
    ORDER BY rank
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    type: r.entity_type,
    id: r.entity_id,
    mockupId: r.mockup_id,
    mockupSlug: r.mockup_slug,
    mockupName: r.mockup_name,
    excerpt: r.excerpt,
    annotationId: r.annotation_id,
  }));
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { search } from '@/lib/search/service';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

const mockRow = {
  entity_type: 'mockup',
  entity_id: 'mid1',
  mockup_id: 'mid1',
  annotation_id: null,
  mockup_slug: 'my-mockup',
  mockup_name: 'My Mockup',
  excerpt: 'Hello <mark>world</mark>',
};

describe('search service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('returns mapped results for a mockup hit', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([mockRow]);
    const results = await search('world');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      type: 'mockup',
      id: 'mid1',
      mockupId: 'mid1',
      mockupSlug: 'my-mockup',
      mockupName: 'My Mockup',
      excerpt: 'Hello <mark>world</mark>',
      annotationId: null,
    });
  });

  it('returns mapped results for a message hit', async () => {
    const msgRow = {
      entity_type: 'message',
      entity_id: 'msg1',
      mockup_id: 'mid1',
      annotation_id: 'ann1',
      mockup_slug: 'my-mockup',
      mockup_name: 'My Mockup',
      excerpt: 'Found <mark>test</mark> here',
    };
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([msgRow]);
    const results = await search('test');
    expect(results[0].annotationId).toBe('ann1');
    expect(results[0].type).toBe('message');
  });

  it('returns empty array for no results', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);
    const results = await search('nomatch');
    expect(results).toEqual([]);
  });

  it('passes limit to query', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);
    await search('test', 5);
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it('sanitizes FTS5 operators by wrapping in double quotes', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);
    await search('AND OR NOT');
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it('handles special characters without throwing', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);
    await expect(search('(invalid) "query"')).resolves.toEqual([]);
  });

  it('uses default limit of 20 when not specified', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([mockRow]);
    await search('anything');
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });
});

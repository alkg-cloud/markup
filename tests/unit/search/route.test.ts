import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/search/route';

vi.mock('@/lib/auth/identify', () => ({
  identify: vi.fn(),
}));

vi.mock('@/lib/search/service', () => ({
  search: vi.fn(),
}));

import { identify } from '@/lib/auth/identify';
import { search } from '@/lib/search/service';

function makeReq(qs: string): Request {
  return new Request(`http://localhost/api/search${qs}`);
}

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('returns 401 when not authenticated', async () => {
    vi.mocked(identify).mockResolvedValueOnce(null);
    const res = await GET(makeReq('?q=test'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
  });

  it('returns 400 when q is missing', async () => {
    vi.mocked(identify).mockResolvedValueOnce({ kind: 'user', userId: 'u1', sessionId: 's1' });
    const res = await GET(makeReq(''));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_query');
  });

  it('returns 400 when q is empty string', async () => {
    vi.mocked(identify).mockResolvedValueOnce({ kind: 'user', userId: 'u1', sessionId: 's1' });
    const res = await GET(makeReq('?q='));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_query');
  });

  it('returns 200 with results', async () => {
    vi.mocked(identify).mockResolvedValueOnce({ kind: 'agent', tokenId: 'a1', name: 'bot' });
    vi.mocked(search).mockResolvedValueOnce([
      {
        type: 'mockup',
        id: 'mid1',
        mockupId: 'mid1',
        mockupSlug: 'slug',
        mockupName: 'Name',
        excerpt: 'test',
        annotationId: null,
      },
    ]);
    const res = await GET(makeReq('?q=test'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.query).toBe('test');
    expect(body.results).toHaveLength(1);
  });

  it('passes limit param to search service', async () => {
    vi.mocked(identify).mockResolvedValueOnce({ kind: 'user', userId: 'u1', sessionId: 's1' });
    vi.mocked(search).mockResolvedValueOnce([]);
    const res = await GET(makeReq('?q=hello&limit=5'));
    expect(res.status).toBe(200);
    expect(search).toHaveBeenCalledWith('hello', 5);
  });

  it('clamps limit to max 50', async () => {
    vi.mocked(identify).mockResolvedValueOnce({ kind: 'user', userId: 'u1', sessionId: 's1' });
    vi.mocked(search).mockResolvedValueOnce([]);
    const res = await GET(makeReq('?q=hello&limit=999'));
    expect(res.status).toBe(400);
  });
});

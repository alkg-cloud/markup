import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/version/route';

describe('GET /api/version', () => {
  it('returns the package version and api schema version', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
      api: 'v1',
    });
  });

  it('returns the same version as package.json', async () => {
    const pkg = await import('../../../package.json', { with: { type: 'json' } });
    const res = await GET();
    const body = await res.json();
    expect(body.version).toBe(pkg.default.version);
  });
});

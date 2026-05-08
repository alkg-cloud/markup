import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { GET as serveMockup } from '@/app/_mockups/[mockupId]/[...path]/route';
import { addVersion, createMockupFromZip } from '@/lib/mockup/service';
import { prisma } from '@/lib/prisma';

const fixture = (n: string) => path.resolve('tests/fixtures/mockups', n);

describe('GET /_mockups/[mockupId]/[...path]', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
  });

  it('serves index.html with HTML content-type and CSP header', async () => {
    const created = await createMockupFromZip({
      name: 'X',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const res = await serveMockup(new Request('http://l/_mockups/x/index.html'), {
      params: Promise.resolve({ mockupId: created.mockup.id, path: ['index.html'] }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('private, no-cache');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    const body = await res.text();
    expect(body).toContain('hi');
  });

  it('rejects path traversal', async () => {
    const created = await createMockupFromZip({
      name: 'X',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const res = await serveMockup(new Request('http://l/_mockups/x/../etc/passwd'), {
      params: Promise.resolve({ mockupId: created.mockup.id, path: ['..', 'etc', 'passwd'] }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown mockup', async () => {
    const res = await serveMockup(new Request('http://l/_mockups/x/index.html'), {
      params: Promise.resolve({ mockupId: 'does-not-exist', path: ['index.html'] }),
    });
    expect(res.status).toBe(404);
  });

  it('serves a specific historical version when ?v=<vid> is provided', async () => {
    const { mockup, version: v1 } = await createMockupFromZip({
      name: 'V',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    // Add v2; v2 becomes current, v1 is now historical
    await addVersion({
      mockupId: mockup.id,
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    // Request v1 explicitly via ?v=<v1Id>
    const url = `http://l/_mockups/${mockup.id}/index.html?v=${v1.id}`;
    const res = await serveMockup(new Request(url), {
      params: Promise.resolve({ mockupId: mockup.id, path: ['index.html'] }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown ?v=<vid>', async () => {
    const { mockup } = await createMockupFromZip({
      name: 'V2',
      zipPath: fixture('valid-simple.zip'),
      createdBy: 'u',
      createdByType: 'user',
    });
    const url = `http://l/_mockups/${mockup.id}/index.html?v=does-not-exist`;
    const res = await serveMockup(new Request(url), {
      params: Promise.resolve({ mockupId: mockup.id, path: ['index.html'] }),
    });
    expect(res.status).toBe(404);
  });
});

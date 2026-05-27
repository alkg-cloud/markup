import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as createAgentToken } from '@/app/api/agent-tokens/route';
import { POST as setup } from '@/app/api/auth/setup/route';
import { GET as getViewer } from '@/app/api/mockups/[id]/viewer/route';
import { POST as createMockup } from '@/app/api/mockups/route';
import { prisma } from '@/lib/prisma';

const fixture = (n: string) => path.resolve('tests/fixtures/mockups', n);

async function adminCookie() {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.config.deleteMany();
  const r = await setup(
    new Request('http://l', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@x.com', password: 'longpassword12345', name: 'A' }),
    }),
  );
  const cookie = r.headers.get('set-cookie');
  if (!cookie) throw new Error('no cookie');
  const m = cookie.match(/mk_session=([^;]+)/);
  if (!m) throw new Error('no mk_session');
  return m[1];
}

async function mintAgentToken(
  adminCookieValue: string,
): Promise<{ id: string; plaintext: string }> {
  const r = await createAgentToken(
    new Request('http://l/api/agent-tokens', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `mk_session=${adminCookieValue}` },
      body: JSON.stringify({ name: `agent-${Math.random().toString(36).slice(2, 8)}` }),
    }),
  );
  const json = await r.json();
  return { id: json.id, plaintext: json.plaintext };
}

async function uploadMockup(cookie: string, name: string) {
  const fd = new FormData();
  fd.set('name', name);
  fd.set(
    'build',
    new Blob([fs.readFileSync(fixture('valid-simple.zip'))], { type: 'application/zip' }),
    'mockup.zip',
  );
  const res = await createMockup(
    new Request('http://l/api/mockups', {
      method: 'POST',
      headers: { cookie: `mk_session=${cookie}` },
      body: fd,
    }),
  );
  return res.json();
}

describe('GET /api/mockups/[id]/viewer', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
    await prisma.agentToken.deleteMany();
  });

  it('returns 401 without auth', async () => {
    const res = await getViewer(new Request('http://l'), {
      params: Promise.resolve({ id: 'any' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown mockupId', async () => {
    const cookie = await adminCookie();
    const res = await getViewer(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: 'no-such-mockup' }) },
    );
    expect(res.status).toBe(404);
  });

  it('returns 200 with viewer payload shape for an owned mockup', async () => {
    const cookie = await adminCookie();
    const created = await uploadMockup(cookie, 'ViewerTest');
    const res = await getViewer(
      new Request('http://l', { headers: { cookie: `mk_session=${cookie}` } }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mockupId).toBe(created.id);
    expect(typeof body.mockupName).toBe('string');
    expect(typeof body.mockupSrc).toBe('string');
    expect(typeof body.currentUser).toBe('string');
    expect(typeof body.currentUserColorIndex).toBe('number');
    expect(Array.isArray(body.versions)).toBe(true);
    expect(Array.isArray(body.annotations)).toBe(true);
    // uploaded mockup should have exactly one version
    expect(body.versions).toHaveLength(1);
    expect(body.versions[0].current).toBe(true);
  });

  it('agent identity returns 200 with same payload shape', async () => {
    const cookie = await adminCookie();
    // Mockup is user-owned but viewer route has no ownership gate
    const created = await uploadMockup(cookie, 'AgentViewerTest');
    const token = await mintAgentToken(cookie);
    const res = await getViewer(
      new Request('http://l', {
        headers: { authorization: `Bearer ${token.plaintext}` },
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mockupId).toBe(created.id);
    expect(Array.isArray(body.versions)).toBe(true);
    expect(Array.isArray(body.annotations)).toBe(true);
  });

  it('agent identity returns 404 for unknown mockupId (no 403 ownership gate)', async () => {
    const cookie = await adminCookie();
    const token = await mintAgentToken(cookie);
    const res = await getViewer(
      new Request('http://l', {
        headers: { authorization: `Bearer ${token.plaintext}` },
      }),
      { params: Promise.resolve({ id: 'no-such-mockup' }) },
    );
    // The viewer route has no ownership-based 403 — unknown id returns 404 for any identity
    expect(res.status).toBe(404);
  });
});

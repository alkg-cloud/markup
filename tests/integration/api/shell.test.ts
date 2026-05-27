import { beforeEach, describe, expect, it } from 'vitest';

import { POST as createAgentToken } from '@/app/api/agent-tokens/route';
import { POST as setup } from '@/app/api/auth/setup/route';
import { POST as createProjectRoute } from '@/app/api/projects/route';
import { GET as getShell } from '@/app/api/shell/route';
import { prisma } from '@/lib/prisma';

async function adminCookie() {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.config.deleteMany();
  const r = await setup(
    new Request('http://l', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'a@x.com',
        password: 'longpassword12345',
        name: 'Ada Lovelace',
      }),
    }),
  );
  return r.headers.get('set-cookie')!.match(/mk_session=([^;]+)/)![1];
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

beforeEach(async () => {
  await prisma.message.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.annotation.deleteMany();
  await prisma.mockupVersion.deleteMany();
  await prisma.mockup.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.project.deleteMany({ where: { slug: { not: 'unsorted' } } });
  await prisma.agentToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.config.deleteMany();
});

describe('GET /api/shell', () => {
  it('returns 401 when no auth cookie/bearer is present', async () => {
    const r = await getShell(new Request('http://l/api/shell'));
    expect(r.status).toBe(401);
  });

  it('returns all required top-level keys when authed', async () => {
    const cookie = await adminCookie();
    const r = await getShell(
      new Request('http://l/api/shell', {
        headers: { cookie: `mk_session=${cookie}` },
      }),
    );
    expect(r.status).toBe(200);
    const body = await r.json();

    expect(body).toHaveProperty('identity');
    expect(body).toHaveProperty('projects');
    expect(body).toHaveProperty('orphanMockups');
    expect(body).toHaveProperty('mockupNames');
    expect(body).toHaveProperty('recentMockups');
    expect(body).toHaveProperty('sidebarCollapsed');

    expect(Array.isArray(body.projects)).toBe(true);
    expect(Array.isArray(body.orphanMockups)).toBe(true);
    expect(typeof body.mockupNames).toBe('object');
    expect(typeof body.recentMockups).toBe('object');
    expect(typeof body.sidebarCollapsed).toBe('boolean');

    // User identity includes profile info.
    expect(body.identity).toMatchObject({
      kind: 'user',
      name: 'Ada Lovelace',
      email: 'a@x.com',
      role: 'admin',
    });
  });

  it('includes a project the user created via prisma', async () => {
    const cookie = await adminCookie();

    // Create a project via the API so it gets a proper slug.
    const createRes = await createProjectRoute(
      new Request('http://l/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: `mk_session=${cookie}` },
        body: JSON.stringify({ name: 'Shell-Test-Project' }),
      }),
    );
    const created = await createRes.json();

    const r = await getShell(
      new Request('http://l/api/shell', {
        headers: { cookie: `mk_session=${cookie}` },
      }),
    );
    expect(r.status).toBe(200);
    const body = await r.json();

    const found = body.projects.find((p: { id: string }) => p.id === created.id);
    expect(found).toBeTruthy();
    expect(found.name).toBe('Shell-Test-Project');
    expect(found.slug).toBe('shell-test-project');
  });

  it('reflects the sidebar cookie state (collapsed = true)', async () => {
    const cookie = await adminCookie();

    // Without the sidebar cookie: sidebarCollapsed should be false.
    const r1 = await getShell(
      new Request('http://l/api/shell', {
        headers: { cookie: `mk_session=${cookie}` },
      }),
    );
    const body1 = await r1.json();
    expect(body1.sidebarCollapsed).toBe(false);

    // With the sidebar cookie set to "true": sidebarCollapsed should be true.
    const r2 = await getShell(
      new Request('http://l/api/shell', {
        headers: { cookie: `mk_session=${cookie}; markup-sidebar-collapsed=true` },
      }),
    );
    const body2 = await r2.json();
    expect(body2.sidebarCollapsed).toBe(true);
  });

  it('marks an orphan mockup (no projectId) in the orphanMockups array', async () => {
    const cookie = await adminCookie();

    // Insert a mockup with no projectId/folderId (orphan).
    await prisma.mockup.create({
      data: {
        name: 'Orphan Mockup',
        slug: 'shell-int-orphan',
        projectId: null,
        folderId: null,
        position: 0,
        status: 'open',
      },
    });

    // Insert a non-orphan mockup to ensure only orphans appear.
    const createRes = await createProjectRoute(
      new Request('http://l/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: `mk_session=${cookie}` },
        body: JSON.stringify({ name: 'Shell-Orphan-Project' }),
      }),
    );
    const project = await createRes.json();
    await prisma.mockup.create({
      data: {
        name: 'Nested Mockup',
        slug: 'shell-int-nested',
        projectId: project.id,
        folderId: null,
        position: 0,
        status: 'open',
      },
    });

    const r = await getShell(
      new Request('http://l/api/shell', {
        headers: { cookie: `mk_session=${cookie}` },
      }),
    );
    expect(r.status).toBe(200);
    const body = await r.json();

    // Orphan mockup appears in orphanMockups.
    expect(body.orphanMockups).toHaveLength(1);
    expect(body.orphanMockups[0].slug).toBe('shell-int-orphan');
    expect(body.orphanMockups[0].name).toBe('Orphan Mockup');

    // The nested mockup does NOT appear in orphanMockups.
    const orphanSlugs = body.orphanMockups.map((m: { slug: string }) => m.slug);
    expect(orphanSlugs).not.toContain('shell-int-nested');

    // Both mockups appear in mockupNames and recentMockups.
    const allMockupIds = Object.keys(body.mockupNames);
    expect(allMockupIds.length).toBeGreaterThanOrEqual(2);
  });

  it('agent identity: returns shell data with kind=agent and no user profile fields', async () => {
    // Set up admin to mint an agent token.
    const cookie = await adminCookie();
    const token = await mintAgentToken(cookie);

    // Create a project via user so there is something in the tree.
    const createRes = await createProjectRoute(
      new Request('http://l/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: `mk_session=${cookie}` },
        body: JSON.stringify({ name: 'Agent-Visible-Project' }),
      }),
    );
    const project = await createRes.json();

    const r = await getShell(
      new Request('http://l/api/shell', {
        headers: { authorization: `Bearer ${token.plaintext}` },
      }),
    );
    expect(r.status).toBe(200);
    const body = await r.json();

    // Agent identity is surfaced correctly.
    expect(body.identity.kind).toBe('agent');
    // Agent has no user profile — name/email/role are undefined (absent or null).
    expect(body.identity.name).toBeUndefined();
    expect(body.identity.email).toBeUndefined();
    expect(body.identity.role).toBeUndefined();

    // Projects are still returned (route does not filter by agent ownership).
    const found = body.projects.find((p: { id: string }) => p.id === project.id);
    expect(found).toBeTruthy();
    expect(found.name).toBe('Agent-Visible-Project');

    // Standard shape keys are present.
    expect(Array.isArray(body.orphanMockups)).toBe(true);
    expect(typeof body.mockupNames).toBe('object');
    expect(typeof body.recentMockups).toBe('object');
  });
});

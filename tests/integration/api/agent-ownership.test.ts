import { beforeEach, describe, expect, it } from 'vitest';
import { DELETE as deleteAgentToken } from '@/app/api/agent-tokens/[id]/route';
import { POST as createAgentToken } from '@/app/api/agent-tokens/route';
import { POST as setup } from '@/app/api/auth/setup/route';
import { POST as createFolder } from '@/app/api/projects/[id]/folders/route';
import { DELETE as deleteProject, PATCH as patchProject } from '@/app/api/projects/[id]/route';
import { POST as createProject } from '@/app/api/projects/route';
import { prisma } from '@/lib/prisma';

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

function authHeaders(plaintext: string) {
  return { 'content-type': 'application/json', authorization: `Bearer ${plaintext}` };
}

beforeEach(async () => {
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

describe('agent ownership — project creation', () => {
  it('agent creates project with polymorphic ownership recorded', async () => {
    const admin = await adminCookie();
    const token = await mintAgentToken(admin);

    const res = await createProject(
      new Request('http://l/api/projects', {
        method: 'POST',
        headers: authHeaders(token.plaintext),
        body: JSON.stringify({ name: 'agent-project' }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();

    const row = await prisma.project.findUnique({ where: { id: body.id } });
    expect(row?.createdBy).toBe(token.id);
    expect(row?.createdByType).toBe('agent');
  });
});

describe('agent ownership — delete gate', () => {
  it('agent can delete own project', async () => {
    const admin = await adminCookie();
    const token = await mintAgentToken(admin);

    const createRes = await createProject(
      new Request('http://l/api/projects', {
        method: 'POST',
        headers: authHeaders(token.plaintext),
        body: JSON.stringify({ name: 'agent-own' }),
      }),
    );
    const { id } = await createRes.json();

    const del = await deleteProject(
      new Request(`http://l/api/projects/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token.plaintext),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(del.status).toBe(200);
    expect(await prisma.project.findUnique({ where: { id } })).toBeNull();
  });

  it('agent cannot delete user-created project (403 forbidden_owner)', async () => {
    const admin = await adminCookie();
    const token = await mintAgentToken(admin);

    const create = await createProject(
      new Request('http://l/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: `mk_session=${admin}` },
        body: JSON.stringify({ name: 'admin-project' }),
      }),
    );
    const { id } = await create.json();

    const del = await deleteProject(
      new Request(`http://l/api/projects/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token.plaintext),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(del.status).toBe(403);
    expect((await del.json()).error).toBe('forbidden_owner');
  });

  it('agent cannot PATCH user-created project (403 forbidden_owner)', async () => {
    const admin = await adminCookie();
    const token = await mintAgentToken(admin);

    const create = await createProject(
      new Request('http://l/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: `mk_session=${admin}` },
        body: JSON.stringify({ name: 'admin-project' }),
      }),
    );
    const { id } = await create.json();

    const res = await patchProject(
      new Request(`http://l/api/projects/${id}`, {
        method: 'PATCH',
        headers: authHeaders(token.plaintext),
        body: JSON.stringify({ name: 'renamed' }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('forbidden_owner');
  });
});

describe('agent ownership — cascade-block', () => {
  it('agent project containing user mockup blocks agent delete (409)', async () => {
    const admin = await adminCookie();
    const token = await mintAgentToken(admin);

    const createP = await createProject(
      new Request('http://l/api/projects', {
        method: 'POST',
        headers: authHeaders(token.plaintext),
        body: JSON.stringify({ name: 'agent-project' }),
      }),
    );
    const { id: projectId } = await createP.json();

    // Insert a user-owned mockup directly via Prisma for test brevity.
    await prisma.mockup.create({
      data: {
        name: 'user-mockup',
        slug: `user-mockup-${Math.random().toString(36).slice(2, 8)}`,
        projectId,
        createdBy: 'admin-user-id-not-the-agent',
        createdByType: 'user',
      },
    });

    const del = await deleteProject(
      new Request(`http://l/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: authHeaders(token.plaintext),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(del.status).toBe(409);
    expect((await del.json()).error).toBe('cascade_blocked_by_other_owner');
  });
});

describe('agent ownership — token revoke SetNull', () => {
  it('revoking a token nulls polymorphic ownership on its rows', async () => {
    const admin = await adminCookie();
    const token = await mintAgentToken(admin);

    const create = await createProject(
      new Request('http://l/api/projects', {
        method: 'POST',
        headers: authHeaders(token.plaintext),
        body: JSON.stringify({ name: 'will-orphan' }),
      }),
    );
    const { id: projectId } = await create.json();

    await deleteAgentToken(
      new Request(`http://l/api/agent-tokens/${token.id}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json', cookie: `mk_session=${admin}` },
      }),
      { params: Promise.resolve({ id: token.id }) },
    );

    const row = await prisma.project.findUnique({ where: { id: projectId } });
    expect(row?.createdBy).toBeNull();
    expect(row?.createdByType).toBeNull();
  });
});

describe('folder creation by agent', () => {
  it('agent creates folder with polymorphic ownership', async () => {
    const admin = await adminCookie();
    const token = await mintAgentToken(admin);

    const createP = await createProject(
      new Request('http://l/api/projects', {
        method: 'POST',
        headers: authHeaders(token.plaintext),
        body: JSON.stringify({ name: 'p1' }),
      }),
    );
    const { id: projectId } = await createP.json();

    const createF = await createFolder(
      new Request(`http://l/api/projects/${projectId}/folders`, {
        method: 'POST',
        headers: authHeaders(token.plaintext),
        body: JSON.stringify({ name: 'f1' }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(createF.status).toBe(201);
    const { id: folderId } = await createF.json();

    const row = await prisma.folder.findUnique({ where: { id: folderId } });
    expect(row?.createdBy).toBe(token.id);
    expect(row?.createdByType).toBe('agent');
  });
});

import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { POST as createReaction } from '@/app/api/messages/[id]/reactions/route';
import { POST as createAnnotation } from '@/app/api/mockups/[id]/annotations/route';
import { createMockupFromZip } from '@/lib/mockup/service';
import { prisma } from '@/lib/prisma';

const fixture = (n: string) => path.resolve('tests/fixtures/mockups', n);

async function adminCookie() {
  await prisma.reaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.annotation.deleteMany();
  await prisma.mockupVersion.deleteMany();
  await prisma.mockup.deleteMany();
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
        name: 'Alice',
      }),
    }),
  );
  return r.headers.get('set-cookie')!.match(/mk_session=([^;]+)/)![1];
}

async function createMockup(_cookie: string) {
  const r = await createMockupFromZip({
    name: 'Test',
    slug: `test-${Date.now()}`,
    zipPath: fixture('lumen-coffee.zip'),
    createdBy: 'u1',
    createdByType: 'user',
  });
  return r.mockup;
}

describe('POST /api/mockups/[id]/annotations — JSON (comment flow)', () => {
  let cookie: string;

  beforeEach(async () => {
    cookie = await adminCookie();
  });

  it('creates a comment-only annotation with anchors[] + colorIndex + status', async () => {
    const m = await createMockup(cookie);
    const res = await createAnnotation(
      new Request(`http://l/api/mockups/${m.id}/annotations`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `mk_session=${cookie}`,
        },
        body: JSON.stringify({
          body: 'Headline kerning too tight at this size.',
          colorIndex: 0,
          status: 'open',
          anchors: [
            {
              path: ':scope>div>div>div:nth-of-type(1)>h1',
              textOffset: 16,
              subX: 0.42,
              subY: 0.68,
            },
          ],
        }),
      }),
      { params: Promise.resolve({ id: m.id }) },
    );
    expect(res.status).toBe(201);
    const j = await res.json();
    expect(j.colorIndex).toBe(0);
    expect(j.status).toBe('open');
    expect(j.anchors).toHaveLength(1);
  });

  it('rejects payloads missing body', async () => {
    const m = await createMockup(cookie);
    const res = await createAnnotation(
      new Request(`http://l/api/mockups/${m.id}/annotations`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `mk_session=${cookie}`,
        },
        body: JSON.stringify({
          colorIndex: 0,
          anchors: [],
        }),
      }),
      { params: Promise.resolve({ id: m.id }) },
    );
    expect(res.status).toBe(400);
  });

  it('accepts annotations with zero anchors (text-only)', async () => {
    const m = await createMockup(cookie);
    const res = await createAnnotation(
      new Request(`http://l/api/mockups/${m.id}/annotations`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `mk_session=${cookie}`,
        },
        body: JSON.stringify({
          body: 'No pins, just a note.',
          colorIndex: 5,
          anchors: [],
        }),
      }),
      { params: Promise.resolve({ id: m.id }) },
    );
    expect(res.status).toBe(201);
  });
});

describe('POST /api/messages/[id]/reactions', () => {
  let cookie: string;
  let messageId: string;

  beforeEach(async () => {
    cookie = await adminCookie();
    const m = await createMockup(cookie);
    const create = await createAnnotation(
      new Request(`http://l/api/mockups/${m.id}/annotations`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `mk_session=${cookie}`,
        },
        body: JSON.stringify({
          body: 'A note',
          colorIndex: 0,
          anchors: [],
        }),
      }),
      { params: Promise.resolve({ id: m.id }) },
    );
    const j = await create.json();
    const thread = await prisma.thread.findFirst({
      where: { annotationId: j.id },
      include: { messages: true },
    });
    messageId = thread!.messages[0]!.id;
  });

  it('creates a reaction on first call', async () => {
    const res = await createReaction(
      new Request(`http://l/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `mk_session=${cookie}`,
        },
        body: JSON.stringify({ emoji: '👍' }),
      }),
      { params: Promise.resolve({ id: messageId }) },
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.reactions['👍']).toHaveLength(1);
  });

  it('removes the reaction on second call (toggle)', async () => {
    // first call — create
    await createReaction(
      new Request(`http://l/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `mk_session=${cookie}`,
        },
        body: JSON.stringify({ emoji: '👍' }),
      }),
      { params: Promise.resolve({ id: messageId }) },
    );
    // second call — delete
    const res = await createReaction(
      new Request(`http://l/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `mk_session=${cookie}`,
        },
        body: JSON.stringify({ emoji: '👍' }),
      }),
      { params: Promise.resolve({ id: messageId }) },
    );
    const j = await res.json();
    expect(j.reactions['👍']).toBeUndefined();
  });

  it('returns 400 on invalid body', async () => {
    const res = await createReaction(
      new Request(`http://l/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `mk_session=${cookie}`,
        },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: messageId }) },
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when message does not exist', async () => {
    const res = await createReaction(
      new Request(`http://l/api/messages/nope/reactions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `mk_session=${cookie}`,
        },
        body: JSON.stringify({ emoji: '👍' }),
      }),
      { params: Promise.resolve({ id: 'nope' }) },
    );
    expect(res.status).toBe(404);
  });
});

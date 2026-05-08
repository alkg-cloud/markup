import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as setup } from '@/app/api/auth/setup/route';
import { POST as reopen } from '@/app/api/threads/[id]/reopen/route';
import { POST as reply } from '@/app/api/threads/[id]/reply/route';
import { POST as resolve } from '@/app/api/threads/[id]/resolve/route';
import { createAnnotation } from '@/lib/annotation/service';
import { createMockupFromZip } from '@/lib/mockup/service';
import { prisma } from '@/lib/prisma';

const fixture = (n: string) => path.resolve('tests/fixtures/mockups', n);

async function bootstrap() {
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
      body: JSON.stringify({ email: 'a@x.com', password: 'longpassword12345', name: 'A' }),
    }),
  );
  const cookie = r.headers.get('set-cookie');
  if (!cookie) throw new Error('no cookie');
  const m = cookie.match(/mk_session=([^;]+)/);
  if (!m) throw new Error('no mk_session');
  const sessVal = m[1];

  const mockup = await createMockupFromZip({
    name: 'X',
    zipPath: fixture('valid-simple.zip'),
    createdBy: 'u',
    createdByType: 'user',
  });
  const annotation = await createAnnotation({
    mockupId: mockup.mockup.id,
    screenshotPng: Buffer.from([0x89]),
    tldrawJson: {},
    message: 'initial',
    authorId: 'u',
    authorType: 'user',
  });
  return { sessVal, threadId: annotation.thread.id };
}

describe('thread endpoints', () => {
  beforeEach(async () => {
    // bootstrap creates fresh state per test
  });

  it('reply appends a message', async () => {
    const { sessVal, threadId } = await bootstrap();
    const res = await reply(
      new Request('http://l', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: `mk_session=${sessVal}` },
        body: JSON.stringify({ body: 'first reply' }),
      }),
      { params: Promise.resolve({ id: threadId }) },
    );
    expect(res.status).toBe(201);
    const messages = await prisma.message.findMany({ where: { threadId } });
    expect(messages).toHaveLength(2); // initial + reply
  });

  it('resolve flips status and reopen flips it back', async () => {
    const { sessVal, threadId } = await bootstrap();
    await resolve(
      new Request('http://l', {
        method: 'POST',
        headers: { cookie: `mk_session=${sessVal}` },
      }),
      { params: Promise.resolve({ id: threadId }) },
    );
    let t = await prisma.thread.findUnique({ where: { id: threadId } });
    expect(t?.status).toBe('resolved');

    await reopen(
      new Request('http://l', {
        method: 'POST',
        headers: { cookie: `mk_session=${sessVal}` },
      }),
      { params: Promise.resolve({ id: threadId }) },
    );
    t = await prisma.thread.findUnique({ where: { id: threadId } });
    expect(t?.status).toBe('open');
  });
});

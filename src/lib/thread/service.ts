import { prisma } from '@/lib/prisma';

interface AppendInput {
  threadId: string;
  body: string;
  authorId: string;
  authorType: 'user' | 'agent';
}

export async function appendMessage(input: AppendInput) {
  return prisma.message.create({
    data: {
      threadId: input.threadId,
      authorType: input.authorType,
      authorId: input.authorId,
      body: input.body,
    },
  });
}

export async function setThreadStatus(
  threadId: string,
  status: 'open' | 'resolved',
  actor: { id: string; kind: 'user' | 'agent' | 'system' },
) {
  const updated = await prisma.thread.update({
    where: { id: threadId },
    data: { status },
  });
  await prisma.message.create({
    data: {
      threadId,
      authorType: 'system',
      authorId: actor.id,
      body: `${actor.kind} ${actor.id} marked thread ${status}`,
    },
  });
  return updated;
}

export async function getThread(id: string) {
  return prisma.thread.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
}

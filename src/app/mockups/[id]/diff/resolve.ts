import { prisma } from '@/lib/prisma';

export type DiffResolution =
  | { kind: 'ok'; from: { id: string; createdAt: Date }; to: { id: string; createdAt: Date } }
  | { kind: 'invalid' }
  | { kind: 'not_found' };

export async function resolveDiffParams(
  mockupId: string,
  fromVid: string | null,
  toVid: string | null,
): Promise<DiffResolution> {
  if (!fromVid || !toVid) return { kind: 'invalid' };
  const mockup = await prisma.mockup.findUnique({
    where: { id: mockupId },
    include: { versions: { select: { id: true, createdAt: true } } },
  });
  if (!mockup) return { kind: 'not_found' };
  const map = new Map(mockup.versions.map((v) => [v.id, v.createdAt]));
  const fromAt = map.get(fromVid);
  const toAt = map.get(toVid);
  if (!fromAt || !toAt) return { kind: 'invalid' };
  return {
    kind: 'ok',
    from: { id: fromVid, createdAt: fromAt },
    to: { id: toVid, createdAt: toAt },
  };
}

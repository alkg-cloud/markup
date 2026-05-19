import 'server-only';

import { prisma } from '@/lib/prisma';

export interface DisplayName {
  kind: 'user' | 'agent';
  id: string;
  name: string;
}

/**
 * Resolve the human-readable name for a `createdBy` cuid. Looks up the user
 * (when `createdByType === 'user'`) or agent token (otherwise) and returns
 * the resolved name. Falls back to a short cuid prefix when the row is gone.
 *
 * Used by Versions, ThreadTimeline, and any other view that wants to show
 * "by Admin" or "by reviewer-bot" instead of the raw cuid.
 */
export async function resolveDisplayName(
  createdBy: string,
  createdByType: string,
): Promise<DisplayName> {
  if (createdByType === 'user') {
    const user = await prisma.user.findUnique({ where: { id: createdBy } });
    if (user) return { kind: 'user', id: user.id, name: user.name };
    return { kind: 'user', id: createdBy, name: `user ${createdBy.slice(-6)}` };
  }
  const agent = await prisma.agentToken.findUnique({ where: { id: createdBy } });
  if (agent) return { kind: 'agent', id: agent.id, name: agent.name };
  return { kind: 'agent', id: createdBy, name: `agent ${createdBy.slice(-6)}` };
}

/**
 * Batch variant — single round-trip per kind.
 */
export async function resolveDisplayNames(
  rows: Array<{ createdBy: string; createdByType: string }>,
): Promise<Map<string, DisplayName>> {
  const userIds = new Set<string>();
  const agentIds = new Set<string>();
  for (const r of rows) {
    if (r.createdByType === 'user') userIds.add(r.createdBy);
    else agentIds.add(r.createdBy);
  }
  const [users, agents] = await Promise.all([
    userIds.size
      ? prisma.user.findMany({ where: { id: { in: Array.from(userIds) } } })
      : Promise.resolve([]),
    agentIds.size
      ? prisma.agentToken.findMany({ where: { id: { in: Array.from(agentIds) } } })
      : Promise.resolve([]),
  ]);
  const map = new Map<string, DisplayName>();
  for (const u of users) map.set(u.id, { kind: 'user', id: u.id, name: u.name });
  for (const a of agents) map.set(a.id, { kind: 'agent', id: a.id, name: a.name });
  for (const r of rows) {
    if (map.has(r.createdBy)) continue;
    map.set(r.createdBy, {
      kind: r.createdByType === 'user' ? 'user' : 'agent',
      id: r.createdBy,
      name: `${r.createdByType} ${r.createdBy.slice(-6)}`,
    });
  }
  return map;
}

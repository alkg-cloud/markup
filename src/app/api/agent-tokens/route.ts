import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAgentToken } from '@/lib/auth/agent-token';
import { identify, requireAdmin } from '@/lib/auth/identify';
import { prisma } from '@/lib/prisma';

interface ErrorWithStatus extends Error {
  status?: number;
}

const nameRe = /^[A-Za-z0-9_-]+$/;
const createSchema = z.object({ name: z.string().regex(nameRe).min(1).max(64) });

export async function GET(req: Request) {
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    const err = e as ErrorWithStatus;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
  const tokens = await prisma.agentToken.findMany({
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ tokens });
}

export async function POST(req: Request) {
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    const err = e as ErrorWithStatus;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const exists = await prisma.agentToken.findUnique({ where: { name: parsed.data.name } });
  if (exists) return NextResponse.json({ error: 'name_exists' }, { status: 409 });
  const created = await generateAgentToken(parsed.data.name);
  return NextResponse.json(created, { status: 201 });
}

export const dynamic = 'force-dynamic';

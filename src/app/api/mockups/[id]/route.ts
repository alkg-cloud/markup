import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identify, requireAdmin } from '@/lib/auth/identify';
import { getMockup, setMockupStatus } from '@/lib/mockup/service';

interface ErrorWithStatus extends Error {
  status?: number;
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['open', 'resolved', 'archived']).optional(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await identify(req);
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id: mockupId } = await ctx.params;
  const mockup = await getMockup(mockupId);
  if (!mockup) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(mockup);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    const err = e as ErrorWithStatus;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
  const { id: mockupId } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  if (parsed.data.status) {
    await setMockupStatus(mockupId, parsed.data.status);
  }
  if (parsed.data.name) {
    const { prisma } = await import('@/lib/prisma');
    await prisma.mockup.update({ where: { id: mockupId }, data: { name: parsed.data.name } });
  }
  const updated = await getMockup(mockupId);
  if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(updated);
}

export const dynamic = 'force-dynamic';

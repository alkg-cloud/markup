import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { getMockup, renameMockup, setMockupStatus } from '@/lib/mockup/service';
import { urlSafeNameSchema } from '@/lib/validation/url-safe-name';

const patchSchema = z.object({
  name: urlSafeNameSchema(200).optional(),
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
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
  }
  const { id: mockupId } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  if (parsed.data.status) {
    await setMockupStatus(mockupId, parsed.data.status);
  }
  if (parsed.data.name) {
    await renameMockup(mockupId, parsed.data.name);
  }
  const updated = await getMockup(mockupId);
  if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(updated);
}

export const dynamic = 'force-dynamic';

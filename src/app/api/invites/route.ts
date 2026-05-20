import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { effectiveStatus, expiryToDate, generateInvite } from '@/lib/auth/invite-token';
import { assertSameOrigin } from '@/lib/auth/origin';
import { prisma } from '@/lib/prisma';

const createSchema = z.object({
  email: z.string().email().optional().nullable(),
  role: z.enum(['admin', 'member']),
  expiry: z.enum(['24h', '7d', '30d', 'never']),
});

export async function GET(req: Request) {
  try {
    await requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
  }
  const rows = await prisma.invite.findMany({
    orderBy: { createdAt: 'desc' },
    include: { usedBy: { select: { email: true } } },
  });
  const now = new Date();
  const invites = rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    status: effectiveStatus(r, now),
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    usedAt: r.usedAt,
    usedByEmail: r.usedBy?.email ?? null,
    revokedAt: r.revokedAt,
    lastFour: r.lastFour,
  }));
  return NextResponse.json({ invites });
}

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  let ident: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    ident = await requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const normalisedEmail = parsed.data.email ? parsed.data.email.trim().toLowerCase() : null;
  const created = await generateInvite({
    email: normalisedEmail,
    role: parsed.data.role,
    expiresAt: expiryToDate(parsed.data.expiry),
    createdById: ident.userId,
  });
  return NextResponse.json(
    {
      id: created.id,
      plaintext: created.plaintext,
      email: created.email,
      role: created.role,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
      lastFour: created.lastFour,
    },
    { status: 201 },
  );
}

export const dynamic = 'force-dynamic';

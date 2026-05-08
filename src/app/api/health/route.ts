import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createFsProbe } from '@/lib/healthcheck';
import { prisma } from '@/lib/prisma';

const probe = createFsProbe({ dir: env().DATA_DIR });

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json({ ok: false, reason: 'db_unreachable' }, { status: 503 });
  }
  if (!(await probe())) {
    return NextResponse.json({ ok: false, reason: 'fs_unwritable' }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';

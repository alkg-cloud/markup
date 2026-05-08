import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createFsProbe } from '@/lib/healthcheck';
import { prisma } from '@/lib/prisma';

let probe: (() => Promise<boolean>) | null = null;

function getProbe() {
  if (!probe) probe = createFsProbe({ dir: env().DATA_DIR });
  return probe;
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json({ ok: false, reason: 'db_unreachable' }, { status: 503 });
  }
  if (!(await getProbe()())) {
    return NextResponse.json({ ok: false, reason: 'fs_unwritable' }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';

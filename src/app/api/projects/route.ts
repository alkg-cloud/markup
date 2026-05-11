import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identify, requireAdmin } from '@/lib/auth/identify';
import { createProject, listProjects } from '@/lib/project/service';

interface ErrorWithStatus extends Error {
  status?: number;
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
});

export async function GET(req: Request) {
  const id = await identify(req);
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const projects = await listProjects();
  return NextResponse.json({ projects });
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
  const project = await createProject({ name: parsed.data.name });
  return NextResponse.json(project, { status: 201 });
}

export const dynamic = 'force-dynamic';

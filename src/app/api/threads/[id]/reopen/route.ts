import { handleThreadStatusChange } from '@/lib/thread/status-handler';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handleThreadStatusChange(req, ctx, 'open');
}

export const dynamic = 'force-dynamic';

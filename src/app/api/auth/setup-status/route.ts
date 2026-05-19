import { NextResponse } from 'next/server';
import { isSetupCompleted } from '@/lib/auth/setup-state';

// Public — drives client-side routing for `/login` and `/setup`. No identity
// can exist before setup completes, so the route exposes only a single bool
// and never returns user data.
export async function GET() {
  const completed = await isSetupCompleted();
  return NextResponse.json({ completed });
}

export const dynamic = 'force-dynamic';

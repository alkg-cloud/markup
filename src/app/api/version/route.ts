import { NextResponse } from 'next/server';
import pkg from '../../../../package.json' with { type: 'json' };

// Public — no auth. Consumed by external CLIs (markup-cli) to perform a
// version-compatibility handshake before any other API call. Stable schema:
// changes to `api` field signal a breaking change in this endpoint, not the
// rest of the surface.
export async function GET() {
  return NextResponse.json({ version: pkg.version, api: 'v1' });
}

export const dynamic = 'force-dynamic';

import type { Identity } from '@/lib/auth/identify';
import { prisma } from '@/lib/prisma';

export interface ViewerProfile {
  userName?: string;
  userEmail?: string;
}

/**
 * Resolve the display name + email for an authenticated identity. Used
 * by every `(app)` server component that hands `Topbar` a user blurb.
 * Agent identities have no user row to look up; both fields stay
 * `undefined` and `Topbar` falls back to its initial-letter avatar.
 */
export async function getViewerProfile(identity: Identity): Promise<ViewerProfile> {
  if (identity.kind !== 'user') return {};
  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { name: true, email: true },
  });
  return {
    userName: user?.name ?? undefined,
    userEmail: user?.email ?? undefined,
  };
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * `/projects` — thin client-side redirect to `/`, the `all-projects`
 * landing. Kept so external bookmarks and inbound links pointing at the
 * legacy index still resolve.
 */
export default function ProjectsIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return null;
}

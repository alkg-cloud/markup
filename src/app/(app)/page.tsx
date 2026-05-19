'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { projectsHref } from '@/lib/project/routes';

/**
 * Root `/` redirects to the canonical projects index. Client-side
 * redirect — middleware already enforces auth gating.
 */
export default function Root() {
  const router = useRouter();
  useEffect(() => {
    router.replace(projectsHref());
  }, [router]);
  return null;
}

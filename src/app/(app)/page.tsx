import { redirect } from 'next/navigation';
import { projectsHref } from '@/lib/project/routes';

/**
 * Root `/` redirects to the canonical projects index. The previous
 * implementation auto-selected the first project from a query string
 * (`?project=<slug>&folder=<id>`); that pattern is replaced by the
 * path-based `/projects/<slug>/<folder-path>/<mockup-slug>` routes.
 */
export default async function Root() {
  redirect(projectsHref());
}

export const dynamic = 'force-dynamic';

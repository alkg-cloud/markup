import { redirect } from 'next/navigation';
import { projectHref } from '@/lib/project/routes';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  redirect(projectHref(slug));
}

export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { projectHref } from '@/lib/project/routes';

interface Props {
  params: Promise<{ slug: string; folderId: string }>;
}

export default async function FolderPage({ params }: Props) {
  const { slug, folderId } = await params;
  redirect(projectHref(slug, folderId));
}

export const dynamic = 'force-dynamic';

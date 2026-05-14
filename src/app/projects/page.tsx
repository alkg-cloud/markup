import { redirect } from 'next/navigation';

export default async function ProjectsPage() {
  redirect('/');
}

export const dynamic = 'force-dynamic';

export function projectHref(projectSlug: string, folderId?: string | null): string {
  const params = new URLSearchParams({ project: projectSlug });
  if (folderId) params.set('folder', folderId);
  return `/?${params.toString()}`;
}

export function projectDisplayName(project: { slug: string; name: string }): string {
  return project.slug === 'unsorted' ? 'Ungrouped' : project.name;
}

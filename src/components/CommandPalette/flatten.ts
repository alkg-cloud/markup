import type { TreeProject } from '@/components/ProjectTree/ProjectTree';

export interface FlatSearchItem {
  id: string;
  name: string;
  path: string;
  type: 'project' | 'folder' | 'mockup';
  href: string;
  projectSlug: string;
}

export function flattenProjectTree(projects: TreeProject[]): FlatSearchItem[] {
  const items: FlatSearchItem[] = [];

  for (const project of projects) {
    items.push({
      id: project.id,
      name: project.name,
      path: '',
      type: 'project',
      href: `/projects/${project.slug}`,
      projectSlug: project.slug,
    });

    walkFolders(project.folders, project.name, project.slug, items);

    for (const mockup of project.mockups) {
      items.push({
        id: mockup.id,
        name: mockup.name,
        path: project.name,
        type: 'mockup',
        href: `/mockups/${mockup.id}`,
        projectSlug: project.slug,
      });
    }
  }

  return items;
}

function walkFolders(
  folders: TreeProject['folders'],
  path: string,
  projectSlug: string,
  items: FlatSearchItem[],
): void {
  for (const folder of folders) {
    items.push({
      id: folder.id,
      name: folder.name,
      path,
      type: 'folder',
      href: `/projects/${projectSlug}`,
      projectSlug,
    });

    const childPath = `${path} / ${folder.name}`;

    for (const mockup of folder.mockups) {
      items.push({
        id: mockup.id,
        name: mockup.name,
        path: childPath,
        type: 'mockup',
        href: `/mockups/${mockup.id}`,
        projectSlug,
      });
    }

    walkFolders(folder.children, childPath, projectSlug, items);
  }
}

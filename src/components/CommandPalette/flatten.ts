import type { TreeProject } from '@/components/ProjectTree/ProjectTree';
import { folderHref, mockupSlugHref, projectHref } from '@/lib/project/routes';

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
      href: projectHref(project.slug),
      projectSlug: project.slug,
    });

    walkFolders(project.folders, project.name, [], project.slug, items);

    for (const mockup of project.mockups) {
      items.push({
        id: mockup.id,
        name: mockup.name,
        path: project.name,
        type: 'mockup',
        href: mockupSlugHref(project.slug, [], mockup.slug),
        projectSlug: project.slug,
      });
    }
  }

  return items;
}

function walkFolders(
  folders: TreeProject['folders'],
  path: string,
  parentNames: ReadonlyArray<string>,
  projectSlug: string,
  items: FlatSearchItem[],
): void {
  for (const folder of folders) {
    const folderPath = [...parentNames, folder.name];
    items.push({
      id: folder.id,
      name: folder.name,
      path,
      type: 'folder',
      href: folderHref(projectSlug, folderPath),
      projectSlug,
    });

    const childPath = `${path} / ${folder.name}`;

    for (const mockup of folder.mockups) {
      items.push({
        id: mockup.id,
        name: mockup.name,
        path: childPath,
        type: 'mockup',
        href: mockupSlugHref(projectSlug, folderPath, mockup.slug),
        projectSlug,
      });
    }

    walkFolders(folder.children, childPath, folderPath, projectSlug, items);
  }
}

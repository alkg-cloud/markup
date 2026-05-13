import type { FlatSearchItem } from './flatten';

export interface GroupedResults {
  projects: FlatSearchItem[];
  folders: FlatSearchItem[];
  mockups: FlatSearchItem[];
  total: number;
}

export function filterAndGroup(items: FlatSearchItem[], query: string): GroupedResults {
  const q = query.toLowerCase().trim();
  const filtered =
    q.length === 0
      ? items
      : items.filter(
          (item) => item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q),
        );

  const groups: GroupedResults = {
    projects: [],
    folders: [],
    mockups: [],
    total: 0,
  };

  for (const item of filtered) {
    if (item.type === 'project') groups.projects.push(item);
    else if (item.type === 'folder') groups.folders.push(item);
    else groups.mockups.push(item);
  }

  groups.total = groups.projects.length + groups.folders.length + groups.mockups.length;
  return groups;
}

import path from 'node:path';

export const MOCKUPS_REL = 'mockups';

export const mockupDir = (root: string, id: string) => path.posix.join(root, MOCKUPS_REL, id);

export const versionDir = (root: string, id: string, vid: string) =>
  path.posix.join(mockupDir(root, id), 'versions', vid);

export const versionBuildDir = (root: string, id: string, vid: string) =>
  path.posix.join(versionDir(root, id, vid), 'build');

export const versionSourceZipPath = (root: string, id: string, vid: string) =>
  path.posix.join(versionDir(root, id, vid), 'source.zip');

export const annotationDir = (root: string, id: string, aid: string) =>
  path.posix.join(mockupDir(root, id), 'annotations', aid);

export const thumbnailPath = (root: string, id: string) =>
  path.posix.join(mockupDir(root, id), 'thumbnail.png');

export function resolveServePath(buildDir: string, segments: string[]): string {
  const target = path.resolve(buildDir, ...segments);
  const root = path.resolve(buildDir);
  if (!(target === root || target.startsWith(root + path.sep))) {
    throw new Error(`path escape: ${segments.join('/')}`);
  }
  return target;
}

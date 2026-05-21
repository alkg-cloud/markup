import type { ComponentType } from 'react';
// UI tab — Lucide (only file that imports react-icons/lu; chrome stays on vsc)
import {
  LuCircle,
  LuHeart,
  LuImage,
  LuLayers,
  LuMousePointer,
  LuPencil,
  LuSquare,
  LuStar,
  LuTriangle,
} from 'react-icons/lu';
// Brands tab — Simple Icons (only file that imports react-icons/si; chrome stays on vsc)
import {
  SiDocker,
  SiFigma,
  SiGithub,
  SiNextdotjs,
  SiReact,
  SiSlack,
  SiTypescript,
  SiVercel,
} from 'react-icons/si';
// Code tab — Codicons (project house set)
import {
  VscAdd,
  VscBell,
  VscCheck,
  VscClose,
  VscComment,
  VscCopy,
  VscEdit,
  VscEye,
  VscFile,
  VscFolder,
  VscFolderOpened,
  VscGear,
  VscHistory,
  VscHome,
  VscInfo,
  VscKey,
  VscLink,
  VscRefresh,
  VscRobot,
  VscSave,
  VscSearch,
  VscTrash,
  VscWand,
  VscWarning,
} from 'react-icons/vsc';

type IconComponent = ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' }>;

export interface IconEntry {
  token: string;
  // Exactly one of Icon or label is set — invariant enforced by construction.
  Icon?: IconComponent;
  label?: string;
  /** @deprecated legacy SVG-string field — kept only for type compat during migration; always undefined post-refactor */
  svg?: never;
}

export const PICKER_ICONS: Record<string, IconEntry[]> = {
  code: [
    { token: 'vsc:VscFile', Icon: VscFile },
    { token: 'vsc:VscFolder', Icon: VscFolder },
    { token: 'vsc:VscFolderOpened', Icon: VscFolderOpened },
    { token: 'vsc:VscGear', Icon: VscGear },
    { token: 'vsc:VscKey', Icon: VscKey },
    { token: 'vsc:VscEdit', Icon: VscEdit },
    { token: 'vsc:VscSave', Icon: VscSave },
    { token: 'vsc:VscRefresh', Icon: VscRefresh },
    { token: 'vsc:VscAdd', Icon: VscAdd },
    { token: 'vsc:VscClose', Icon: VscClose },
    { token: 'vsc:VscSearch', Icon: VscSearch },
    { token: 'vsc:VscCheck', Icon: VscCheck },
    { token: 'vsc:VscInfo', Icon: VscInfo },
    { token: 'vsc:VscWarning', Icon: VscWarning },
    { token: 'vsc:VscComment', Icon: VscComment },
    { token: 'vsc:VscEye', Icon: VscEye },
    { token: 'vsc:VscHistory', Icon: VscHistory },
    { token: 'vsc:VscRobot', Icon: VscRobot },
    { token: 'vsc:VscWand', Icon: VscWand },
    { token: 'vsc:VscTrash', Icon: VscTrash },
    { token: 'vsc:VscHome', Icon: VscHome },
    { token: 'vsc:VscCopy', Icon: VscCopy },
    { token: 'vsc:VscBell', Icon: VscBell },
    { token: 'vsc:VscLink', Icon: VscLink },
  ],
  brands: [
    { token: 'brand:github', Icon: SiGithub },
    { token: 'brand:figma', Icon: SiFigma },
    { token: 'brand:react', Icon: SiReact },
    { token: 'brand:typescript', Icon: SiTypescript },
    { token: 'brand:docker', Icon: SiDocker },
    { token: 'brand:slack', Icon: SiSlack },
    { token: 'brand:vercel', Icon: SiVercel },
    // SiNextdotjs is Simple-Icons' name for Next.js; the stored token stays brand:nextjs
    { token: 'brand:nextjs', Icon: SiNextdotjs },
  ],
  ui: [
    { token: 'ui:layers', Icon: LuLayers },
    { token: 'ui:pencil', Icon: LuPencil },
    { token: 'ui:mousePointer', Icon: LuMousePointer },
    { token: 'ui:square', Icon: LuSquare },
    { token: 'ui:circle', Icon: LuCircle },
    { token: 'ui:triangle', Icon: LuTriangle },
    { token: 'ui:star', Icon: LuStar },
    { token: 'ui:heart', Icon: LuHeart },
    { token: 'ui:image', Icon: LuImage },
  ],
  emoji: [
    { token: 'emoji:🎨', label: '🎨' },
    { token: 'emoji:📐', label: '📐' },
    { token: 'emoji:📱', label: '📱' },
    { token: 'emoji:🖼', label: '🖼' },
    { token: 'emoji:📁', label: '📁' },
    { token: 'emoji:📂', label: '📂' },
    { token: 'emoji:🎯', label: '🎯' },
    { token: 'emoji:🔥', label: '🔥' },
    { token: 'emoji:⚡', label: '⚡' },
    { token: 'emoji:🌟', label: '🌟' },
    { token: 'emoji:💡', label: '💡' },
    { token: 'emoji:🎉', label: '🎉' },
    { token: 'emoji:🚀', label: '🚀' },
    { token: 'emoji:✨', label: '✨' },
    { token: 'emoji:🔮', label: '🔮' },
    { token: 'emoji:🎭', label: '🎭' },
    { token: 'emoji:🎪', label: '🎪' },
    { token: 'emoji:🎸', label: '🎸' },
    { token: 'emoji:🎹', label: '🎹' },
    { token: 'emoji:🎺', label: '🎺' },
    { token: 'emoji:🎻', label: '🎻' },
    { token: 'emoji:🎼', label: '🎼' },
    { token: 'emoji:🎵', label: '🎵' },
    { token: 'emoji:🎶', label: '🎶' },
  ],
};

export function filterIcons(tab: string, query: string): IconEntry[] {
  const icons = PICKER_ICONS[tab] ?? [];
  if (!query) return icons;
  const q = query.toLowerCase();
  return icons.filter((i) => i.token.toLowerCase().includes(q));
}

export type ResolvedIcon = { kind: 'icon'; Icon: IconComponent } | { kind: 'emoji'; glyph: string };

/**
 * Resolve a stored icon token (e.g. `vsc:VscFile`, `emoji:🚀`) to a
 * typed descriptor. Returns `null` for unknown tokens so the caller can
 * fall back to a default glyph.
 *
 * Single source of truth for icon resolution across the project tree,
 * folder header, and project-card surfaces.
 */
export function resolveIconToken(token: string): ResolvedIcon | null {
  if (token.startsWith('emoji:')) {
    return { kind: 'emoji', glyph: token.slice(6) };
  }
  for (const group of Object.values(PICKER_ICONS)) {
    const entry = group.find((e) => e.token === token);
    if (entry?.Icon) return { kind: 'icon', Icon: entry.Icon };
    if (entry?.label) return { kind: 'emoji', glyph: entry.label };
  }
  return null;
}

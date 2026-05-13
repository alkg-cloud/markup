const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 604800;

export function formatRelativeTime(date: Date, now = new Date()): string {
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < MINUTE) return 'agora';
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m`;
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h`;
  if (seconds < WEEK) return `${Math.floor(seconds / DAY)}d`;
  return `${Math.floor(seconds / WEEK)}sem`;
}

import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '@/lib/relative-time';

function ago(seconds: number, now = new Date()) {
  return new Date(now.getTime() - seconds * 1000);
}

describe('formatRelativeTime', () => {
  const now = new Date('2026-05-13T12:00:00Z');

  it('returns "agora" for < 60 seconds', () => {
    expect(formatRelativeTime(ago(0, now), now)).toBe('agora');
    expect(formatRelativeTime(ago(30, now), now)).toBe('agora');
    expect(formatRelativeTime(ago(59, now), now)).toBe('agora');
  });

  it('returns minutes for 1m–59m', () => {
    expect(formatRelativeTime(ago(60, now), now)).toBe('1m');
    expect(formatRelativeTime(ago(120, now), now)).toBe('2m');
    expect(formatRelativeTime(ago(3540, now), now)).toBe('59m');
  });

  it('returns hours for 1h–23h', () => {
    expect(formatRelativeTime(ago(3600, now), now)).toBe('1h');
    expect(formatRelativeTime(ago(7200, now), now)).toBe('2h');
    expect(formatRelativeTime(ago(82800, now), now)).toBe('23h');
  });

  it('returns days for 1d–6d', () => {
    expect(formatRelativeTime(ago(86400, now), now)).toBe('1d');
    expect(formatRelativeTime(ago(259200, now), now)).toBe('3d');
    expect(formatRelativeTime(ago(518400, now), now)).toBe('6d');
  });

  it('returns weeks for 7d+', () => {
    expect(formatRelativeTime(ago(604800, now), now)).toBe('1sem');
    expect(formatRelativeTime(ago(1209600, now), now)).toBe('2sem');
    expect(formatRelativeTime(ago(2419200, now), now)).toBe('4sem');
  });
});

import { describe, expect, it } from 'vitest';
import { appendQuery } from '@/lib/url/append-query';

describe('appendQuery', () => {
  it('appends ?key=value to a path with no query', () => {
    expect(appendQuery('/m/abc/index.html', 'v', 'vid1')).toBe('/m/abc/index.html?v=vid1');
  });

  it('appends &key=value when a query already exists', () => {
    expect(appendQuery('/m/abc/index.html?foo=bar', 'v', 'vid1')).toBe(
      '/m/abc/index.html?foo=bar&v=vid1',
    );
  });

  it('URI-encodes the value', () => {
    expect(appendQuery('/m/abc', 'v', 'vid with space')).toBe('/m/abc?v=vid%20with%20space');
  });

  it('handles trailing hash by inserting before it', () => {
    expect(appendQuery('/m/abc/index.html#top', 'v', 'vid1')).toBe('/m/abc/index.html?v=vid1#top');
  });

  it('handles URL with existing query AND hash (query+hash combination)', () => {
    expect(appendQuery('/m/abc/index.html?foo=bar#top', 'v', 'vid1')).toBe(
      '/m/abc/index.html?foo=bar&v=vid1#top',
    );
  });
});

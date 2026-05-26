import { describe, expect, it } from 'vitest';
import { appendQuery, setQuery } from '@/lib/url/append-query';

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

describe('setQuery', () => {
  it('appends ?key=value when no query exists', () => {
    expect(setQuery('/m/abc/index.html', 'v', 'vid1')).toBe('/m/abc/index.html?v=vid1');
  });

  it('replaces an existing occurrence of the key', () => {
    expect(setQuery('/m/abc/index.html?v=old', 'v', 'new')).toBe('/m/abc/index.html?v=new');
  });

  it('keeps other params and replaces only the matching key', () => {
    expect(setQuery('/m/abc/index.html?foo=bar&v=old&baz=qux', 'v', 'new')).toBe(
      '/m/abc/index.html?foo=bar&baz=qux&v=new',
    );
  });

  it('appends key when existing query has no matching key', () => {
    expect(setQuery('/m/abc/index.html?foo=bar', 'v', 'vid1')).toBe(
      '/m/abc/index.html?foo=bar&v=vid1',
    );
  });

  it('URI-encodes the value', () => {
    expect(setQuery('/m/abc', 'v', 'vid with space')).toBe('/m/abc?v=vid%20with%20space');
  });

  it('preserves trailing hash', () => {
    expect(setQuery('/m/abc?v=old#top', 'v', 'new')).toBe('/m/abc?v=new#top');
  });

  it('deduplicates multiple occurrences of the key', () => {
    expect(setQuery('/m/abc?v=a&v=b&foo=bar', 'v', 'new')).toBe('/m/abc?foo=bar&v=new');
  });
});

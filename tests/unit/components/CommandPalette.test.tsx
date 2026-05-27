// CommandPalette uses next/navigation's useRouter(), which requires the
// App Router context — renderToStaticMarkup can't mount it. Interactive
// behaviour (keyboard, filter, navigation) lives in
// tests/unit/components/command-palette/.
import { describe, expect, it } from 'vitest';
import { escapeHtml, highlightMatch } from '@/components/CommandPalette/CommandPalette';

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('escapes less-than signs', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes greater-than signs', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes all three special characters in one string', () => {
    expect(escapeHtml('<a & b>')).toBe('&lt;a &amp; b&gt;');
  });

  it('returns plain text unchanged when no special characters are present', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('returns an empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('escapes multiple ampersands', () => {
    expect(escapeHtml('a & b & c')).toBe('a &amp; b &amp; c');
  });
});

// ---------------------------------------------------------------------------
// highlightMatch
// ---------------------------------------------------------------------------

describe('highlightMatch', () => {
  it('returns HTML-escaped text unchanged when query is empty string', () => {
    expect(highlightMatch('Homepage', '')).toBe('Homepage');
  });

  it('returns HTML-escaped text when there is no match', () => {
    expect(highlightMatch('Homepage', 'xyz')).toBe('Homepage');
  });

  it('wraps an exact match in <mark> tags', () => {
    expect(highlightMatch('Homepage', 'Home')).toBe('<mark>Home</mark>page');
  });

  it('is case-insensitive when locating the match', () => {
    expect(highlightMatch('Homepage', 'home')).toBe('<mark>Home</mark>page');
  });

  it('matches in the middle of the text', () => {
    expect(highlightMatch('My Homepage', 'page')).toBe('My Home<mark>page</mark>');
  });

  it('HTML-escapes the before-segment', () => {
    expect(highlightMatch('<div> match here', 'match')).toBe('&lt;div&gt; <mark>match</mark> here');
  });

  it('HTML-escapes characters inside the matched segment', () => {
    // query matches text containing "&" — the mark content must be escaped
    expect(highlightMatch('Tom & Jerry', '& ')).toBe('Tom <mark>&amp; </mark>Jerry');
  });

  it('HTML-escapes the after-segment', () => {
    expect(highlightMatch('match <end>', 'match')).toBe('<mark>match</mark> &lt;end&gt;');
  });

  it('handles a full-string match', () => {
    expect(highlightMatch('hello', 'hello')).toBe('<mark>hello</mark>');
  });

  it('returns escaped text unchanged when query is the empty string and text contains special chars', () => {
    expect(highlightMatch('a & b', '')).toBe('a &amp; b');
  });
});

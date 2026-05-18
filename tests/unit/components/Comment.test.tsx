// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Comment } from '@/components/Comment/Comment';
import { formatReactorList } from '@/components/ReactionPill/ReactionPill';
import { initialsForName } from '@/lib/avatar';

describe('initialsForName', () => {
  it('returns first letter of first + last word', () => {
    expect(initialsForName('Alexandre Camillo')).toBe('AC');
    expect(initialsForName('Marina Sá')).toBe('MS');
    expect(initialsForName('Sam Marlowe')).toBe('SM');
  });
  it('handles single word names', () => {
    expect(initialsForName('designer-bot')).toBe('DE');
  });
  it('returns ? for empty', () => {
    expect(initialsForName('')).toBe('?');
    expect(initialsForName(null)).toBe('?');
    expect(initialsForName(undefined)).toBe('?');
  });
});

describe('formatReactorList', () => {
  it('handles 1 user', () => {
    expect(formatReactorList(['Alex'], '👍')).toBe('Alex reacted with 👍');
  });
  it('handles 2 users with "and"', () => {
    expect(formatReactorList(['Alex', 'Marina'], '👍')).toBe('Alex and Marina reacted with 👍');
  });
  it('handles 3+ users with comma + and', () => {
    expect(formatReactorList(['Alex', 'Marina', 'Sam'], '👍')).toBe(
      'Alex, Marina and Sam reacted with 👍',
    );
  });
});

describe('Comment — reply variant', () => {
  const baseProps = {
    author: 'Marina Sá',
    colorIndex: 1,
    timestamp: '12/05 · 19:45',
    body: 'Agreed. Tested with -0.02em.',
    currentUser: 'Alexandre',
  };

  it('renders the head with avatar, name, time', () => {
    const html = renderToStaticMarkup(<Comment {...baseProps} />);
    expect(html).toContain('Marina Sá');
    expect(html).toContain('12/05 · 19:45');
    expect(html).toContain('MS'); // initials
    expect(html).toContain('data-color="1"');
  });

  it('shows reply icon (not kebab) for non-own comments', () => {
    const html = renderToStaticMarkup(<Comment {...baseProps} isOwn={false} />);
    expect(html).toContain('data-tooltip="Reply to Marina Sá"');
    expect(html).not.toContain('data-tooltip="More actions"');
  });

  it('shows kebab (not reply icon) for own comments', () => {
    const html = renderToStaticMarkup(<Comment {...baseProps} author="Alexandre Camillo" isOwn />);
    expect(html).toContain('data-tooltip="More actions"');
  });

  it('renders reactions with current-user state', () => {
    const html = renderToStaticMarkup(
      <Comment {...baseProps} reactions={[{ emoji: '👍', reactedBy: ['Alexandre', 'Marina'] }]} />,
    );
    expect(html).toContain('data-emoji="👍"');
    expect(html).toContain('>2<'); // count
  });
});

describe('Comment — primary variant', () => {
  it('skips the head row', () => {
    const html = renderToStaticMarkup(
      <Comment
        author="Alexandre"
        colorIndex={0}
        timestamp="—"
        body="primary body"
        currentUser="Alexandre"
        variant="primary"
      />,
    );
    expect(html).toContain('primary body');
    // The author name should NOT appear inside the comment (lives in parent meta)
    const headlessRegex = /<header[^>]*>[^<]*<div[^>]*by[^"]*"/;
    expect(headlessRegex.test(html)).toBe(false);
  });
});

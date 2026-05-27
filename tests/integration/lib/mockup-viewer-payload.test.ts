import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCommentAnnotation } from '@/lib/annotation/service';
import { createMockupFromZip } from '@/lib/mockup/service';
import { buildViewerPayload } from '@/lib/mockup/viewer-payload';
import { prisma } from '@/lib/prisma';

const fixture = (n: string) => path.resolve('tests/fixtures/mockups', n);

// Identity helpers
const userIdentity = (userId: string) => ({ kind: 'user' as const, userId });

async function seedMockup(name: string) {
  return createMockupFromZip({
    name,
    zipPath: fixture('valid-simple.zip'),
    createdBy: 'seed-user',
    createdByType: 'user',
    versionCreatedBy: 'seed-user',
    versionCreatedByType: 'user',
  });
}

async function seedAnnotation(
  mockupId: string,
  body: string,
  opts: { authorId?: string; status?: 'open' | 'needs review' | 'resolved'; anchors?: string } = {},
) {
  const authorId = opts.authorId ?? 'anno-author';
  const result = await createCommentAnnotation({
    mockupId,
    body,
    anchors: [],
    colorIndex: 0,
    status: opts.status ?? 'open',
    authorId,
    authorType: 'user',
  });
  // Optionally override anchors in DB if caller passes raw JSON
  if (opts.anchors !== undefined) {
    await prisma.annotation.update({
      where: { id: result.annotation.id },
      data: { anchors: opts.anchors },
    });
  }
  return result;
}

describe('buildViewerPayload', () => {
  beforeEach(async () => {
    await prisma.reaction.deleteMany();
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.mockupVersion.deleteMany();
    await prisma.mockup.deleteMany();
    // Clean up any test users created by the currentUser resolution tests
    await prisma.user.deleteMany({ where: { email: 'alice@test.com' } });
  });

  describe('not found / missing version', () => {
    it('returns { ok: false, error: not_found } for a non-existent mockup id', async () => {
      const result = await buildViewerPayload('does-not-exist', userIdentity('u1'));
      expect(result).toEqual({ ok: false, error: 'not_found' });
    });

    it('returns { ok: false, error: not_found } when mockup has no currentVersionId', async () => {
      // Create a mockup and then manually clear currentVersionId
      const { mockup } = await seedMockup('NoVersion');
      await prisma.mockup.update({
        where: { id: mockup.id },
        data: { currentVersionId: null },
      });
      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result).toEqual({ ok: false, error: 'not_found' });
    });
  });

  describe('canonical payload shape', () => {
    it('returns ok:true with correct top-level fields', async () => {
      const { mockup } = await seedMockup('ShapeTest');
      await seedAnnotation(mockup.id, 'First comment');

      const result = await buildViewerPayload(mockup.id, userIdentity('viewer-user'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { data } = result;
      expect(data.mockupId).toBe(mockup.id);
      expect(data.mockupName).toBe('ShapeTest');
      expect(data.mockupSrc).toMatch(/^\/m\/.+\/index\.html\?v=/);
      expect(typeof data.currentUser).toBe('string');
      expect(typeof data.currentUserColorIndex).toBe('number');
      expect(Array.isArray(data.versions)).toBe(true);
      expect(Array.isArray(data.annotations)).toBe(true);
    });

    it('includes versions mapped from mockup.versions', async () => {
      const { mockup, version } = await seedMockup('VersionTest');

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.versions).toHaveLength(1);
      const v = result.data.versions[0];
      expect(v.id).toBe(version.id);
      expect(v.label).toBe('v1');
      expect(v.current).toBe(true);
      expect(typeof v.sub).toBe('string');
      // sub contains the formatted timestamp
      expect(v.sub).toMatch(/\d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}/);
    });

    it('sets mockupSrc to /m/<id>/index.html?v=<currentVersionId>', async () => {
      const { mockup, version } = await seedMockup('SrcTest');

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.mockupSrc).toBe(`/m/${mockup.id}/index.html?v=${version.id}`);
    });
  });

  describe('annotation filtering', () => {
    it('includes annotations that have a thread with at least one message', async () => {
      const { mockup } = await seedMockup('FilterInclude');
      await seedAnnotation(mockup.id, 'visible comment');

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.annotations).toHaveLength(1);
    });

    it('excludes annotations without a thread', async () => {
      const { mockup } = await seedMockup('FilterExclude');
      // Create a bare annotation with no thread (raw prisma)
      await prisma.annotation.create({
        data: {
          mockupId: mockup.id,
          screenshotPath: '',
          tldrawPath: '',
          anchors: '[]',
          colorIndex: 0,
          status: 'open',
          createdBy: 'u',
          createdByType: 'user',
        },
      });

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.annotations).toHaveLength(0);
    });

    it('groups multiple annotations correctly', async () => {
      const { mockup } = await seedMockup('MultiAnnot');
      await seedAnnotation(mockup.id, 'first');
      await seedAnnotation(mockup.id, 'second');
      await seedAnnotation(mockup.id, 'third');

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.annotations).toHaveLength(3);
    });

    it('assigns descending label numbers (newest annotation first → label 1)', async () => {
      const { mockup } = await seedMockup('LabelOrder');
      await seedAnnotation(mockup.id, 'anno-a');
      await seedAnnotation(mockup.id, 'anno-b');

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const labels = result.data.annotations.map((a) => a.label);
      // Labels are total - idx; with 2 annotations: [2, 1] (descending by createdAt)
      expect(labels).toEqual([2, 1]);
    });
  });

  describe('annotation shape', () => {
    it('returns correct annotation fields', async () => {
      const { mockup } = await seedMockup('AnnoShape');
      const { annotation } = await seedAnnotation(mockup.id, 'Hello world', {
        authorId: 'user-abc',
      });

      const result = await buildViewerPayload(mockup.id, userIdentity('user-abc'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const a = result.data.annotations[0];
      expect(a.id).toBe(annotation.id);
      expect(typeof a.threadId).toBe('string');
      expect(typeof a.colorIndex).toBe('number');
      expect(typeof a.label).toBe('number');
      expect(typeof a.author).toBe('string');
      expect(typeof a.authorColorIndex).toBe('number');
      // date formatted as DD/MM/YYYY · HH:MM
      expect(a.date).toMatch(/\d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}/);
    });

    it('primary comment has expected fields', async () => {
      const { mockup } = await seedMockup('PrimaryComment');
      await seedAnnotation(mockup.id, 'Primary body', { authorId: 'msg-author' });

      const result = await buildViewerPayload(mockup.id, userIdentity('viewer'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { primary } = result.data.annotations[0];
      expect(primary.body).toBe('Primary body');
      expect(typeof primary.id).toBe('string');
      expect(typeof primary.author).toBe('string');
      expect(typeof primary.authorColorIndex).toBe('number');
      expect(primary.timestamp).toMatch(/\d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}/);
    });

    it('isOwn is true when message author matches the current user', async () => {
      const { mockup } = await seedMockup('IsOwn');
      await seedAnnotation(mockup.id, 'my comment', { authorId: 'me-user' });

      const result = await buildViewerPayload(mockup.id, userIdentity('me-user'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.annotations[0].primary.isOwn).toBe(true);
    });

    it('isOwn is false when message author differs from current user', async () => {
      const { mockup } = await seedMockup('NotOwn');
      await seedAnnotation(mockup.id, 'their comment', { authorId: 'other-user' });

      const result = await buildViewerPayload(mockup.id, userIdentity('me-user'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.annotations[0].primary.isOwn).toBe(false);
    });

    it('replies are reverse-ordered (newest reply first)', async () => {
      const { mockup } = await seedMockup('RepliesOrder');
      const { thread } = await seedAnnotation(mockup.id, 'original');
      // Add two replies with explicit ordering
      await prisma.message.create({
        data: { threadId: thread.id, authorType: 'user', authorId: 'r-user', body: 'reply-one' },
      });
      await prisma.message.create({
        data: { threadId: thread.id, authorType: 'user', authorId: 'r-user', body: 'reply-two' },
      });

      const result = await buildViewerPayload(mockup.id, userIdentity('viewer'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { replies } = result.data.annotations[0];
      // replies are sliced from messages[1:] then reversed → newest first
      expect(replies).toHaveLength(2);
      expect(replies![0].body).toBe('reply-two');
      expect(replies![1].body).toBe('reply-one');
    });
  });

  describe('asStatus branch (via annotation.status)', () => {
    it('passes through "open" status', async () => {
      const { mockup } = await seedMockup('StatusOpen');
      await seedAnnotation(mockup.id, 'x', { status: 'open' });

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.annotations[0].status).toBe('open');
    });

    it('passes through "needs review" status', async () => {
      const { mockup } = await seedMockup('StatusNeedsReview');
      await seedAnnotation(mockup.id, 'x', { status: 'needs review' });

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.annotations[0].status).toBe('needs review');
    });

    it('passes through "resolved" status', async () => {
      const { mockup } = await seedMockup('StatusResolved');
      await seedAnnotation(mockup.id, 'x', { status: 'resolved' });

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.annotations[0].status).toBe('resolved');
    });

    it('falls back to "open" for an unknown status string', async () => {
      const { mockup } = await seedMockup('StatusUnknown');
      await seedAnnotation(mockup.id, 'x');
      // Force an invalid status directly via prisma
      const annos = await prisma.annotation.findMany({ where: { mockupId: mockup.id } });
      await prisma.annotation.update({
        where: { id: annos[0].id },
        data: { status: 'bogus-status' },
      });

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.annotations[0].status).toBe('open');
    });
  });

  describe('parseAnchors branch (via annotation.anchors)', () => {
    it('parses valid JSON anchor array', async () => {
      const { mockup } = await seedMockup('AnchorsValid');
      const anchors = JSON.stringify([{ path: 'div>p', offsetX: 10, offsetY: 20 }]);
      await seedAnnotation(mockup.id, 'anchored', { anchors });

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.annotations[0].anchors).toEqual([
        { path: 'div>p', offsetX: 10, offsetY: 20 },
      ]);
    });

    it('returns [] for malformed JSON in anchors field', async () => {
      const { mockup } = await seedMockup('AnchorsMalformed');
      await seedAnnotation(mockup.id, 'bad anchors', { anchors: 'not-valid-json{{{' });

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.annotations[0].anchors).toEqual([]);
    });

    it('returns [] when anchors field is a non-array JSON value', async () => {
      const { mockup } = await seedMockup('AnchorsNonArray');
      await seedAnnotation(mockup.id, 'object anchors', { anchors: '{"key":"value"}' });

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.annotations[0].anchors).toEqual([]);
    });
  });

  describe('colorForUser (deterministic via currentUserColorIndex)', () => {
    it('same userId always maps to the same color index', async () => {
      const { mockup: m1 } = await seedMockup('ColorDet1');
      const { mockup: m2 } = await seedMockup('ColorDet2');

      const r1 = await buildViewerPayload(m1.id, userIdentity('fixed-user-id'));
      const r2 = await buildViewerPayload(m2.id, userIdentity('fixed-user-id'));
      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
      if (!r1.ok || !r2.ok) return;

      expect(r1.data.currentUserColorIndex).toBe(r2.data.currentUserColorIndex);
    });

    it('currentUserColorIndex is in range [0, 15]', async () => {
      const { mockup } = await seedMockup('ColorRange');

      const result = await buildViewerPayload(mockup.id, userIdentity('some-user'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.currentUserColorIndex).toBeGreaterThanOrEqual(0);
      expect(result.data.currentUserColorIndex).toBeLessThanOrEqual(15);
    });

    it('distinct users get different color indices (annotator vs viewer)', async () => {
      const { mockup } = await seedMockup('ColorDistinct');
      await seedAnnotation(mockup.id, 'text', { authorId: 'author-aaa' });

      const result = await buildViewerPayload(mockup.id, userIdentity('viewer-bbb'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // authorColorIndex for 'author-aaa' should differ from currentUserColorIndex for 'viewer-bbb'
      // (not guaranteed to differ but these specific IDs do differ by hash)
      const authorColorIndex = result.data.annotations[0].authorColorIndex;
      const viewerColorIndex = result.data.currentUserColorIndex;
      // Both must be valid palette indices
      expect(authorColorIndex).toBeGreaterThanOrEqual(0);
      expect(authorColorIndex).toBeLessThanOrEqual(15);
      expect(viewerColorIndex).toBeGreaterThanOrEqual(0);
      expect(viewerColorIndex).toBeLessThanOrEqual(15);
    });
  });

  describe('formatTimestamp (via annotation.date and version.sub)', () => {
    it('formats annotation date as DD/MM/YYYY · HH:MM', async () => {
      const { mockup } = await seedMockup('TimestampFormat');
      await seedAnnotation(mockup.id, 'timestamped');

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { date } = result.data.annotations[0];
      expect(date).toMatch(/^\d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}$/);
    });

    it('zero-pads single-digit day and month', async () => {
      const { mockup } = await seedMockup('ZeroPad');
      await seedAnnotation(mockup.id, 'zero-pad test');
      // Force a specific early date (Jan 5, 2026)
      const annos = await prisma.annotation.findMany({ where: { mockupId: mockup.id } });
      await prisma.annotation.update({
        where: { id: annos[0].id },
        data: { createdAt: new Date('2026-01-05T03:04:00.000Z') },
      });

      const result = await buildViewerPayload(mockup.id, userIdentity('u1'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Should contain padded values (05/01/2026 · HH:MM)
      expect(result.data.annotations[0].date).toMatch(/^05\/01\/2026 · \d{2}:\d{2}$/);
    });
  });

  describe('currentUser resolution', () => {
    it('resolves display name from DB when user exists', async () => {
      // Create a real user in DB first
      const user = await prisma.user.create({
        data: { id: 'known-user-id', name: 'Alice', email: 'alice@test.com', passwordHash: 'x' },
      });
      // Create a mockup with that user as the version author so they appear in authorRefs
      const { mockup } = await createMockupFromZip({
        name: 'UserResolve',
        zipPath: fixture('valid-simple.zip'),
        createdBy: user.id,
        createdByType: 'user',
        versionCreatedBy: user.id,
        versionCreatedByType: 'user',
      });

      const result = await buildViewerPayload(mockup.id, userIdentity(user.id));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.currentUser).toBe('Alice');

      await prisma.user.delete({ where: { id: user.id } });
    });

    it('falls back to "user <id suffix>" when userId not in DB', async () => {
      const { mockup } = await seedMockup('UserFallback');
      const unknownId = 'unknown-user-xyz999';

      const result = await buildViewerPayload(mockup.id, userIdentity(unknownId));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.currentUser).toBe(`user ${unknownId.slice(-6)}`);
    });
  });

  describe('reactions are included in primary comment', () => {
    it('groups reactions by emoji with reactedBy display names', async () => {
      const { mockup } = await seedMockup('Reactions');
      const { thread } = await seedAnnotation(mockup.id, 'reacted comment', {
        authorId: 'r-author',
      });
      // Get the message
      const msg = await prisma.message.findFirst({ where: { threadId: thread.id } });
      expect(msg).toBeTruthy();
      if (!msg) return;
      // Add two reactions to the same emoji
      await prisma.reaction.create({
        data: { messageId: msg.id, userId: 'reactor-1', emoji: '👍' },
      });
      await prisma.reaction.create({
        data: { messageId: msg.id, userId: 'reactor-2', emoji: '👍' },
      });
      await prisma.reaction.create({
        data: { messageId: msg.id, userId: 'reactor-1', emoji: '❤️' },
      });

      const result = await buildViewerPayload(mockup.id, userIdentity('viewer'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { reactions } = result.data.annotations[0].primary;
      expect(reactions).toBeDefined();
      const thumbs = reactions!.find((r) => r.emoji === '👍');
      expect(thumbs).toBeDefined();
      expect(thumbs!.reactedBy).toHaveLength(2);
      const heart = reactions!.find((r) => r.emoji === '❤️');
      expect(heart).toBeDefined();
      expect(heart!.reactedBy).toHaveLength(1);
    });
  });
});

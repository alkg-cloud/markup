/**
 * Dev seeder — wipes the local DB and re-creates a rich state for QA:
 *
 *   - 1 admin user (credentials below)
 *   - 1 peer (editor) user — for cross-author threads
 *   - 3 projects:
 *       Lumen-Coffee (Hero + Pricing folders, real fixture mockups)
 *       Design-Demos (Consoles folder, real fixture mockup)
 *       Sandbox      (nested folders down to depth 4, mockups at each
 *                     level; for QA of the tree component + cascade)
 *   - Orphan mockups (no project, no folder) for QA of loose-mockup state
 *   - Multiple versions on the lumen-coffee mockup (v1/v2/v3)
 *   - 6 annotations on lumen-coffee-hero across statuses + cross-user
 *     threads + emoji reactions; 1 annotation on helio-pricing
 *   - 1 agent token
 *
 * Usage: `pnpm exec tsx scripts/seed-dev.ts`
 *   (or with --force to skip the confirmation prompt)
 *
 * Safe to run repeatedly — it wipes the DB first.
 */
/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { stdin, stdout } from 'node:process';
import readline from 'node:readline/promises';
import { hashPassword } from '../src/lib/auth/password';
import { env } from '../src/lib/env';
import { addVersion, createMockupFromZip } from '../src/lib/mockup/service';
import { prisma } from '../src/lib/prisma';

const TEST_EMAIL = 'qa@markup.dev';
const TEST_PASSWORD = 'markup-dev-2026';
const TEST_NAME = 'Alexandre Camillo';

// Secondary user — gives the seeded thread a believable two-author
// shape so the reactions UI can be exercised with both "react with my
// own emoji" + "react with an emoji the other user already gave".
const PEER_EMAIL = 'maria@markup.dev';
const PEER_PASSWORD = 'markup-dev-2026';
const PEER_NAME = 'Maria Santos';

const fixture = (n: string) => path.resolve('tests/fixtures/mockups', n);

interface AnchorRecord {
  path: string;
  offsetX?: number;
  offsetY?: number;
  textOffset?: number;
  subX?: number;
  subY?: number;
}

async function confirm() {
  if (process.argv.includes('--force')) return;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const a = await rl.question(
    'This wipes the dev DB and re-seeds with QA data. Type "yes" to continue: ',
  );
  rl.close();
  if (a.trim() !== 'yes') {
    console.log('aborted');
    process.exit(1);
  }
}

async function wipe() {
  // Order matters — cascading deletes follow FK chain.
  await prisma.reaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.annotation.deleteMany();
  await prisma.mockupVersion.deleteMany();
  await prisma.mockup.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.project.deleteMany();
  await prisma.agentToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.config.deleteMany();
  // Wipe mockup artefacts on disk (zip extracts, thumbnails)
  const dataMockupsDir = path.join(env().DATA_DIR, 'mockups');
  if (fs.existsSync(dataMockupsDir)) {
    fs.rmSync(dataMockupsDir, { recursive: true, force: true });
  }
}

async function createUser() {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const user = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      name: TEST_NAME,
      passwordHash,
      role: 'admin',
    },
  });
  await prisma.config.upsert({
    where: { key: 'setup_completed' },
    create: { key: 'setup_completed', value: 'true' },
    update: { value: 'true' },
  });
  return user;
}

async function createPeer() {
  const passwordHash = await hashPassword(PEER_PASSWORD);
  return prisma.user.create({
    data: {
      email: PEER_EMAIL,
      name: PEER_NAME,
      passwordHash,
      role: 'editor',
    },
  });
}

async function createProjects() {
  // Project icons MUST be valid `IconPicker` tokens (see
  // `src/components/IconPicker/icons.ts`). The previous `'coffee'` and
  // `'sparkle'` strings were not in the picker — opening the project
  // settings rendered an empty icon slot.
  // Names are URL-path segments now (per `URL_SAFE_NAME_PATTERN`), so
  // they can only contain `[A-Za-z0-9_-]`. The display value is the
  // raw name; hyphens read fine as word separators.
  const lumen = await prisma.project.create({
    data: { name: 'Lumen-Coffee', slug: 'lumen-coffee', icon: 'emoji:🔥', position: 0 },
  });
  const demos = await prisma.project.create({
    data: { name: 'Design-Demos', slug: 'design-demos', icon: 'emoji:🎨', position: 1 },
  });
  const sandbox = await prisma.project.create({
    data: { name: 'Sandbox', slug: 'sandbox', icon: 'emoji:🧪', position: 2 },
  });
  const lumenHero = await prisma.folder.create({
    data: { projectId: lumen.id, name: 'Hero', position: 0 },
  });
  const lumenPricing = await prisma.folder.create({
    data: { projectId: lumen.id, name: 'Pricing', position: 1 },
  });
  const demosConsoles = await prisma.folder.create({
    data: { projectId: demos.id, name: 'Consoles', position: 0 },
  });

  // Sandbox project — nested folder tree exercising depth 2..4 of the
  // MAX_FOLDER_DEPTH=4 limit. Created via prisma.folder.create directly
  // (bypasses the service's depth guard, which is fine here since this
  // is seed data, not user input). Layout:
  //
  //   Sandbox/
  //   ├── Web/                       d=1
  //   │   ├── Marketing/             d=2
  //   │   │   ├── Q1-Launch/         d=3
  //   │   │   │   └── Variants/      d=4 (leaf at max depth)
  //   │   │   └── Q2-Launch/         d=3
  //   │   └── Docs/                  d=2
  //   ├── Mobile/                    d=1
  //   │   ├── Onboarding/            d=2
  //   │   │   └── Welcome/           d=3
  //   │   └── Profile/               d=2
  //   └── Archive/                   d=1
  const sbWeb = await prisma.folder.create({
    data: { projectId: sandbox.id, name: 'Web', position: 0 },
  });
  const sbMarketing = await prisma.folder.create({
    data: { projectId: sandbox.id, parentId: sbWeb.id, name: 'Marketing', position: 0 },
  });
  const sbQ1 = await prisma.folder.create({
    data: { projectId: sandbox.id, parentId: sbMarketing.id, name: 'Q1-Launch', position: 0 },
  });
  const sbQ1Variants = await prisma.folder.create({
    data: { projectId: sandbox.id, parentId: sbQ1.id, name: 'Variants', position: 0 },
  });
  const sbQ2 = await prisma.folder.create({
    data: { projectId: sandbox.id, parentId: sbMarketing.id, name: 'Q2-Launch', position: 1 },
  });
  const sbDocs = await prisma.folder.create({
    data: { projectId: sandbox.id, parentId: sbWeb.id, name: 'Docs', position: 1 },
  });
  const sbMobile = await prisma.folder.create({
    data: { projectId: sandbox.id, name: 'Mobile', position: 1 },
  });
  const sbOnboarding = await prisma.folder.create({
    data: { projectId: sandbox.id, parentId: sbMobile.id, name: 'Onboarding', position: 0 },
  });
  const sbWelcome = await prisma.folder.create({
    data: { projectId: sandbox.id, parentId: sbOnboarding.id, name: 'Welcome', position: 0 },
  });
  const sbProfile = await prisma.folder.create({
    data: { projectId: sandbox.id, parentId: sbMobile.id, name: 'Profile', position: 1 },
  });
  const sbArchive = await prisma.folder.create({
    data: { projectId: sandbox.id, name: 'Archive', position: 2 },
  });

  return {
    lumen,
    demos,
    sandbox,
    lumenHero,
    lumenPricing,
    demosConsoles,
    sb: {
      Web: sbWeb,
      Marketing: sbMarketing,
      Q1: sbQ1,
      Q1Variants: sbQ1Variants,
      Q2: sbQ2,
      Docs: sbDocs,
      Mobile: sbMobile,
      Onboarding: sbOnboarding,
      Welcome: sbWelcome,
      Profile: sbProfile,
      Archive: sbArchive,
    },
  };
}

async function uploadMockup(opts: {
  name: string;
  slug: string;
  zipName: string;
  /** Omit to create an orphan mockup (no project, no folder). */
  projectId?: string;
  folderId?: string;
  authorId: string;
}) {
  const r = await createMockupFromZip({
    name: opts.name,
    slug: opts.slug,
    zipPath: fixture(opts.zipName),
    projectId: opts.projectId,
    folderId: opts.folderId,
    createdBy: opts.authorId,
    createdByType: 'user',
    versionCreatedBy: opts.authorId,
    versionCreatedByType: 'user',
  });
  return r;
}

interface ReplyInput {
  body: string;
  /** Author id; defaults to the annotation's primary author. Supplying
   *  the peer's id makes the thread read as a real conversation between
   *  two users. */
  authorId?: string;
}

interface SeedAnnotationInput {
  mockupId: string;
  authorId: string;
  authorName: string;
  body: string;
  status: 'open' | 'needs review' | 'resolved';
  colorIndex: number;
  anchors: AnchorRecord[];
  /** Reply bodies (oldest first). Strings inherit the annotation author;
   *  objects can override authorId so threads include peer responses. */
  replies?: Array<string | ReplyInput>;
  /** Map of emoji to authorIds that reacted to the primary message. */
  primaryReactions?: Record<string, string[]>;
  /** Reactions on the Nth reply (0-indexed). */
  replyReactions?: Record<number, Record<string, string[]>>;
  /** Override the version this annotation belongs to. Defaults to current. */
  versionId?: string;
}

async function seedAnnotation(input: SeedAnnotationInput) {
  const versionId =
    input.versionId ??
    (
      await prisma.mockup.findUnique({
        where: { id: input.mockupId },
        select: { currentVersionId: true },
      })
    )?.currentVersionId ??
    null;

  const annotation = await prisma.annotation.create({
    data: {
      mockupId: input.mockupId,
      screenshotPath: '',
      tldrawPath: '',
      anchors: JSON.stringify(input.anchors),
      colorIndex: input.colorIndex,
      status: input.status,
      createdBy: input.authorId,
      createdByType: 'user',
      createdOnVersionId: versionId,
    },
  });
  const thread = await prisma.thread.create({
    data: { annotationId: annotation.id, status: 'open' },
  });
  const primary = await prisma.message.create({
    data: {
      threadId: thread.id,
      authorType: 'user',
      authorId: input.authorId,
      body: input.body,
    },
  });
  // Stagger reply timestamps by 1 minute so the order in the UI is stable.
  let cursor = Date.now() + 60_000;
  for (const raw of input.replies ?? []) {
    const reply = typeof raw === 'string' ? { body: raw } : raw;
    await prisma.message.create({
      data: {
        threadId: thread.id,
        authorType: 'user',
        authorId: reply.authorId ?? input.authorId,
        body: reply.body,
        createdAt: new Date(cursor),
      },
    });
    cursor += 60_000;
  }
  // Reactions on the primary message
  for (const [emoji, userIds] of Object.entries(input.primaryReactions ?? {})) {
    for (const uid of userIds) {
      await prisma.reaction.create({
        data: { messageId: primary.id, userId: uid, emoji },
      });
    }
  }
  // Reactions on specific replies
  if (input.replyReactions) {
    const messages = await prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
    });
    for (const [idxStr, emojiMap] of Object.entries(input.replyReactions)) {
      const idx = Number(idxStr);
      const msg = messages[idx + 1]; // +1 because messages[0] is primary
      if (!msg) continue;
      for (const [emoji, userIds] of Object.entries(emojiMap)) {
        for (const uid of userIds) {
          await prisma.reaction.create({
            data: { messageId: msg.id, userId: uid, emoji },
          });
        }
      }
    }
  }
  return annotation;
}

async function main() {
  console.log('  Confirming wipe …');
  await confirm();
  console.log('  Wiping DB + data dir …');
  await wipe();

  console.log('  Creating admin user …');
  const user = await createUser();
  console.log(`     ${user.email} / ${TEST_PASSWORD} (role=${user.role})`);

  console.log('  Creating peer user (for cross-author threads) …');
  const peer = await createPeer();
  console.log(`     ${peer.email} / ${PEER_PASSWORD} (role=${peer.role})`);

  console.log('  Creating projects + folders …');
  const { lumen, demos, sandbox, lumenHero, lumenPricing, demosConsoles, sb } =
    await createProjects();

  console.log('  Uploading mockups …');
  const lumenCoffee = await uploadMockup({
    name: 'Lumen-Coffee-Hero',
    slug: 'lumen-coffee-hero',
    zipName: 'lumen-coffee.zip',
    projectId: lumen.id,
    folderId: lumenHero.id,
    authorId: user.id,
  });
  const helio = await uploadMockup({
    name: 'Helio-Pricing',
    slug: 'helio-pricing',
    zipName: 'helio-pricing.zip',
    projectId: lumen.id,
    folderId: lumenPricing.id,
    authorId: user.id,
  });
  const drone = await uploadMockup({
    name: 'Drone-Console',
    slug: 'drone-console',
    zipName: 'drone-console.zip',
    projectId: demos.id,
    folderId: demosConsoles.id,
    authorId: user.id,
  });

  // Sandbox mockups — one per leaf folder so the tree shows realistic
  // content at every depth (d=2..d=4). All re-use existing fixture zips;
  // their contents are duplicated by design (this is QA data, not a
  // canonical fixture library).
  console.log('  Uploading Sandbox mockups at every depth …');
  await uploadMockup({
    name: 'Hero-Variant-A',
    slug: 'sb-hero-variant-a',
    zipName: 'lumen-coffee.zip',
    projectId: sandbox.id,
    folderId: sb.Q1Variants.id, // d=4 leaf
    authorId: user.id,
  });
  await uploadMockup({
    name: 'Hero-Variant-B',
    slug: 'sb-hero-variant-b',
    zipName: 'helio-pricing.zip',
    projectId: sandbox.id,
    folderId: sb.Q1Variants.id, // d=4 leaf
    authorId: peer.id,
  });
  await uploadMockup({
    name: 'Q2-Pricing-Tiers',
    slug: 'sb-q2-pricing-tiers',
    zipName: 'helio-pricing.zip',
    projectId: sandbox.id,
    folderId: sb.Q2.id, // d=3
    authorId: user.id,
  });
  await uploadMockup({
    name: 'Brand-Docs-Cover',
    slug: 'sb-brand-docs-cover',
    zipName: 'valid-simple.zip',
    projectId: sandbox.id,
    folderId: sb.Docs.id, // d=2
    authorId: user.id,
  });
  await uploadMockup({
    name: 'Welcome-Screen',
    slug: 'sb-welcome-screen',
    zipName: 'with-thumbnail.zip',
    projectId: sandbox.id,
    folderId: sb.Welcome.id, // d=3
    authorId: user.id,
  });
  await uploadMockup({
    name: 'Onboarding-Loader',
    slug: 'sb-onboarding-loader',
    zipName: 'valid-simple.zip',
    projectId: sandbox.id,
    folderId: sb.Onboarding.id, // d=2
    authorId: peer.id,
  });
  await uploadMockup({
    name: 'Profile-Settings',
    slug: 'sb-profile-settings',
    zipName: 'drone-console.zip',
    projectId: sandbox.id,
    folderId: sb.Profile.id, // d=2
    authorId: user.id,
  });
  await uploadMockup({
    name: 'Old-Brand-V1',
    slug: 'sb-old-brand-v1',
    zipName: 'valid-simple.zip',
    projectId: sandbox.id,
    folderId: sb.Archive.id, // d=1
    authorId: user.id,
  });
  // Project-scoped but folder-less (lives in the project root, no folder).
  await uploadMockup({
    name: 'Sandbox-Root-Sketch',
    slug: 'sb-root-sketch',
    zipName: 'with-thumbnail.zip',
    projectId: sandbox.id,
    authorId: user.id,
  });

  // Orphan mockups — no projectId, no folderId. Exercises the
  // "loose mockup" UI state and the cascade-check guard rails.
  console.log('  Uploading orphan mockups …');
  await uploadMockup({
    name: 'Sketch-Untitled-1',
    slug: 'sketch-untitled-1',
    zipName: 'valid-simple.zip',
    authorId: user.id,
  });
  await uploadMockup({
    name: 'Sketch-Untitled-2',
    slug: 'sketch-untitled-2',
    zipName: 'with-thumbnail.zip',
    authorId: peer.id,
  });
  await uploadMockup({
    name: 'Inbox-Drop',
    slug: 'inbox-drop',
    zipName: 'lumen-coffee.zip',
    authorId: user.id,
  });

  console.log('  Adding v2 + v3 to lumen-coffee …');
  // addVersion auto-promotes each new version to current. Calling
  // twice gives us v1 (initial upload) + v2 + v3 with v3 = current.
  const v2 = await addVersion({
    mockupId: lumenCoffee.mockup.id,
    zipPath: fixture('lumen-coffee.zip'),
    createdBy: user.id,
    createdByType: 'user',
  });
  const v3 = await addVersion({
    mockupId: lumenCoffee.mockup.id,
    zipPath: fixture('lumen-coffee.zip'),
    createdBy: user.id,
    createdByType: 'user',
  });

  console.log('  Seeding annotations …');
  // Annotation 1: open + 3 replies (mixed authors) + cross-user reactions
  // including a pill that BOTH users picked (👍) so the QA flow exercises
  // "toggle a reaction you already gave" and "react with an emoji
  // someone else already gave".
  await seedAnnotation({
    mockupId: lumenCoffee.mockup.id,
    authorId: user.id,
    authorName: user.name,
    body: 'Headline kerning too tight at this size — try -0.02em across hero variants. Also lift leading from 0.96 → 0.98.',
    status: 'open',
    colorIndex: 0,
    anchors: [{ path: ':scope>body>main>section.lede>h1', offsetX: 0.42, offsetY: 0.58 }],
    replies: [
      {
        body: 'I tested -0.02em on the desktop comp — feels right. Mobile still reads tight.',
        authorId: peer.id,
      },
      'Maybe -0.025em for the 96px variant only?',
      { body: 'v3 lands the lifted leading. Closing as fixed.', authorId: peer.id },
    ],
    primaryReactions: {
      '👍': [user.id, peer.id],
      '🔥': [user.id],
      '🎉': [peer.id],
    },
    replyReactions: {
      0: { '👀': [user.id] },
      2: { '✅': [user.id, peer.id], '🚀': [user.id] },
    },
    versionId: v3.id,
  });

  // Annotation 2: needs review + multi-pin + peer reply
  await seedAnnotation({
    mockupId: lumenCoffee.mockup.id,
    authorId: user.id,
    authorName: user.name,
    body: '"Order online" CTA reads generic. "Reserve a bag" matches the scarcity tone we set in the eyebrow.',
    status: 'needs review',
    colorIndex: 1,
    anchors: [
      { path: ':scope>body>header.brand>nav.nav', offsetX: 0.85, offsetY: 0.5 },
      { path: ':scope>body>main>section.lede>h1', offsetX: 0.1, offsetY: 0.2 },
    ],
    replies: [
      { body: 'Brand prefers "Reserve" over "Order". Pinged copy to update.', authorId: peer.id },
    ],
    primaryReactions: { '💯': [peer.id] },
    versionId: v3.id,
  });

  // Annotation 3: resolved + cross-user reactions
  await seedAnnotation({
    mockupId: lumenCoffee.mockup.id,
    authorId: user.id,
    authorName: user.name,
    body: 'Hero portrait crop — bring the eyes to thirds. Designer rebuilt the art on v3, looks good now.',
    status: 'resolved',
    colorIndex: 2,
    anchors: [{ path: ':scope>body>main>aside.specimen', offsetX: 0.5, offsetY: 0.3 }],
    replies: [{ body: 'v3 nails it.', authorId: peer.id }, 'Closing.'],
    primaryReactions: { '✅': [user.id, peer.id] },
    replyReactions: {
      0: { '🚀': [user.id] },
    },
    versionId: v3.id,
  });

  // Annotation 6: authored by peer so the QA user sees "someone else's"
  // annotation (no edit pencil on the primary; reply kebab without
  // edit/delete; reaction picker still works).
  await seedAnnotation({
    mockupId: lumenCoffee.mockup.id,
    authorId: peer.id,
    authorName: peer.name,
    body: 'Drop cap “W” feels too pulled-in. Try a 4px optical inset on the descender so it reads aligned with the body.',
    status: 'open',
    colorIndex: 5,
    anchors: [{ path: ':scope>body>main>section.lede>h1', offsetX: 0.5, offsetY: 0.92 }],
    replies: [{ body: 'Agree — drop the descender, not the cap baseline.', authorId: user.id }],
    primaryReactions: { '🤔': [user.id] },
    versionId: v3.id,
  });

  // Annotation 4: open + single pin + no replies
  await seedAnnotation({
    mockupId: lumenCoffee.mockup.id,
    authorId: user.id,
    authorName: user.name,
    body: 'Price label feels heavy. Try lighter weight for the gram suffix.',
    status: 'open',
    colorIndex: 3,
    anchors: [
      { path: ':scope>body>main>aside.specimen>div.card>div.price', offsetX: 0.7, offsetY: 0.5 },
    ],
    versionId: v3.id,
  });

  // Annotation 5: open + ritual section + 1 reply
  await seedAnnotation({
    mockupId: lumenCoffee.mockup.id,
    authorId: user.id,
    authorName: user.name,
    body: 'Step numbers — switch to monospace, they wobble across breakpoints.',
    status: 'open',
    colorIndex: 4,
    anchors: [{ path: ':scope>body>section.ritual', offsetX: 0.3, offsetY: 0.4 }],
    replies: ['Mono on the step numbers only, not the body text.'],
    versionId: v3.id,
  });

  // Annotation on Helio Pricing too — for cross-mockup demo
  await seedAnnotation({
    mockupId: helio.mockup.id,
    authorId: user.id,
    authorName: user.name,
    body: 'Pricing tier card spacing — bump padding-y to 24px so the headline breathes.',
    status: 'open',
    colorIndex: 0,
    anchors: [{ path: ':scope>body', offsetX: 0.5, offsetY: 0.3 }],
  });

  console.log('  Creating agent token …');
  const tokenSecret = `dev-agent-${Math.random().toString(36).slice(2, 18)}`;
  const tokenHash = await hashPassword(tokenSecret);
  await prisma.agentToken.create({
    data: {
      name: 'qa-agent',
      tokenHash,
      prefix: 'devqa',
      lastFour: tokenSecret.slice(-4),
    },
  });

  console.log('');
  console.log('  Seed complete.');
  console.log('  ──────────────────────────────────────────────');
  console.log(`  Login:    ${TEST_EMAIL}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log(`  Agent token: ${tokenSecret}  (name: qa-agent)`);
  console.log('  ──────────────────────────────────────────────');
  console.log(
    `  Projects:   ${lumen.name}, ${demos.name}, ${sandbox.name} (nested folders to d=4)`,
  );
  console.log(
    `  Folders:    ${lumenHero.name}, ${lumenPricing.name}, ${demosConsoles.name}, +11 in Sandbox`,
  );
  console.log(
    `  Mockups:    lumen-coffee-hero, helio-pricing, drone-console, +9 in Sandbox, +3 orphans`,
  );
  console.log(
    `  Annotations on lumen-coffee-hero: 6  (open×4, needs review×1, resolved×1; one by peer)`,
  );
  console.log(`  Annotations on helio-pricing:    1`);
  console.log(`  Versions on lumen-coffee-hero:   3  (v3 is current)`);
  console.log('');
  console.log('  Open: http://localhost:3000/  (or your tunnel URL)');

  void v2;
  void drone;
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

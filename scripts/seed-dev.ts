/**
 * Dev seeder — wipes the local DB and re-creates a rich state for QA:
 *
 *   - 1 admin user (credentials below)
 *   - 2 projects with folders
 *   - 3 uploaded mockups from `tests/fixtures/mockups/`
 *   - Multiple versions on the lumen-coffee mockup (v1/v2/v3)
 *   - 5 annotations across statuses (open / needs review / resolved),
 *     covering single-pin + multi-pin, with replies + reactions
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

async function createProjects() {
  const lumen = await prisma.project.create({
    data: { name: 'Lumen Coffee', slug: 'lumen-coffee', icon: 'coffee', position: 0 },
  });
  const demos = await prisma.project.create({
    data: { name: 'Design Demos', slug: 'design-demos', icon: 'sparkle', position: 1 },
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
  return { lumen, demos, lumenHero, lumenPricing, demosConsoles };
}

async function uploadMockup(opts: {
  name: string;
  slug: string;
  zipName: string;
  projectId: string;
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
  });
  return r;
}

interface SeedAnnotationInput {
  mockupId: string;
  authorId: string;
  authorName: string;
  body: string;
  status: 'open' | 'needs review' | 'resolved';
  colorIndex: number;
  anchors: AnchorRecord[];
  /** Reply bodies, oldest-first. The seeder posts them with the user as author. */
  replies?: string[];
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
      intentType: 'other',
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
  for (const body of input.replies ?? []) {
    await prisma.message.create({
      data: {
        threadId: thread.id,
        authorType: 'user',
        authorId: input.authorId,
        body,
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

  console.log('  Creating projects + folders …');
  const { lumen, demos, lumenHero, lumenPricing, demosConsoles } = await createProjects();

  console.log('  Uploading mockups …');
  const lumenCoffee = await uploadMockup({
    name: 'Lumen Coffee — Hero',
    slug: 'lumen-coffee-hero',
    zipName: 'lumen-coffee.zip',
    projectId: lumen.id,
    folderId: lumenHero.id,
    authorId: user.id,
  });
  const helio = await uploadMockup({
    name: 'Helio Pricing',
    slug: 'helio-pricing',
    zipName: 'helio-pricing.zip',
    projectId: lumen.id,
    folderId: lumenPricing.id,
    authorId: user.id,
  });
  const drone = await uploadMockup({
    name: 'Drone Console',
    slug: 'drone-console',
    zipName: 'drone-console.zip',
    projectId: demos.id,
    folderId: demosConsoles.id,
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
  // Annotation 1: open + 3 replies + 2 reactions (primary)
  await seedAnnotation({
    mockupId: lumenCoffee.mockup.id,
    authorId: user.id,
    authorName: user.name,
    body: 'Headline kerning too tight at this size — try -0.02em across hero variants. Also lift leading from 0.96 → 0.98.',
    status: 'open',
    colorIndex: 0,
    anchors: [{ path: ':scope>body>section.lede>h1', offsetX: 0.42, offsetY: 0.58 }],
    replies: [
      'I tested -0.02em on the desktop comp — feels right. Mobile still reads tight.',
      'Maybe -0.025em for the 96px variant only?',
      'v3 lands the lifted leading. Closing as fixed.',
    ],
    primaryReactions: {
      '👍': [user.id],
      '🔥': [user.id],
    },
    versionId: v3.id,
  });

  // Annotation 2: needs review + multi-pin (2 pins) + 1 reply
  await seedAnnotation({
    mockupId: lumenCoffee.mockup.id,
    authorId: user.id,
    authorName: user.name,
    body: '"Order online" CTA reads generic. "Reserve a bag" matches the scarcity tone we set in the eyebrow.',
    status: 'needs review',
    colorIndex: 1,
    anchors: [
      { path: ':scope>body>header.brand>nav.nav', offsetX: 0.85, offsetY: 0.5 },
      { path: ':scope>body>section.lede>h1', offsetX: 0.1, offsetY: 0.2 },
    ],
    replies: ['Brand prefers "Reserve" over "Order". Pinged copy to update.'],
    versionId: v3.id,
  });

  // Annotation 3: resolved + 1 reaction
  await seedAnnotation({
    mockupId: lumenCoffee.mockup.id,
    authorId: user.id,
    authorName: user.name,
    body: 'Hero portrait crop — bring the eyes to thirds. Designer rebuilt the art on v3, looks good now.',
    status: 'resolved',
    colorIndex: 2,
    anchors: [{ path: ':scope>body>aside.specimen', offsetX: 0.5, offsetY: 0.3 }],
    replies: ['v3 nails it.', 'Closing.'],
    primaryReactions: { '✅': [user.id] },
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
    anchors: [{ path: ':scope>body>aside.specimen>div.price', offsetX: 0.7, offsetY: 0.5 }],
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
  console.log(`  Projects:   ${lumen.name} (${lumen.slug}), ${demos.name} (${demos.slug})`);
  console.log(`  Folders:    ${lumenHero.name}, ${lumenPricing.name}, ${demosConsoles.name}`);
  console.log(
    `  Mockups:    ${lumenCoffee.mockup.slug}, ${helio.mockup.slug}, ${drone.mockup.slug}`,
  );
  console.log(`  Annotations on lumen-coffee-hero: 5  (open×3, needs review×1, resolved×1)`);
  console.log(`  Annotations on helio-pricing:    1`);
  console.log(`  Versions on lumen-coffee-hero:   3  (v3 is current)`);
  console.log('');
  console.log('  Open: http://localhost:3000/  (or your tunnel URL)');

  void v2;
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

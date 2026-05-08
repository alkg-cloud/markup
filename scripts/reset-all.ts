import fs from 'node:fs';
import path from 'node:path';
import { stdin, stdout } from 'node:process';
import readline from 'node:readline/promises';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

async function main() {
  const stat = fs.statSync(env().DATA_DIR);
  if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) {
    console.error('refusing: data dir not owned by process UID');
    process.exit(2);
  }
  if (!process.argv.includes('--force')) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const ans = await rl.question(
      'This deletes EVERYTHING (users, tokens, mockups, annotations, threads). Type "yes" to continue: ',
    );
    rl.close();
    if (ans.trim() !== 'yes') {
      console.log('aborted');
      process.exit(1);
    }
  }
  await prisma.message.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.annotation.deleteMany();
  await prisma.mockupVersion.deleteMany();
  await prisma.mockup.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agentToken.deleteMany();
  await prisma.config.deleteMany();
  fs.rmSync(path.join(env().DATA_DIR, 'mockups'), { recursive: true, force: true });
  fs.rmSync(path.join(env().DATA_DIR, 'tmp'), { recursive: true, force: true });
  console.log('reset:all complete');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

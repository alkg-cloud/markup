import { z } from 'zod';

const tokenNameRe = /^[A-Za-z0-9_-]+$/;

const envSchema = z.object({
  APP_URL: z.string().url().default('http://localhost:3000'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  DATA_DIR: z.string().min(1),
  DATABASE_URL: z.string().min(1).default('file:./prisma/dev.db'),
  PUID: z.coerce.number().int().nonnegative().default(1000),
  PGID: z.coerce.number().int().nonnegative().default(1000),
  AGENT_TOKENS: z
    .string()
    .default('')
    .transform((raw, ctx) => {
      if (!raw.trim()) return [] as { name: string; secret: string }[];
      return raw.split(',').map((pair) => {
        const idx = pair.indexOf(':');
        if (idx <= 0) {
          ctx.addIssue({ code: 'custom', message: `AGENT_TOKENS pair "${pair}" missing ":"` });
          return { name: '', secret: '' };
        }
        const name = pair.slice(0, idx);
        const secret = pair.slice(idx + 1);
        if (!tokenNameRe.test(name)) {
          ctx.addIssue({
            code: 'custom',
            message: `AGENT_TOKENS agent token name "${name}" must match ${tokenNameRe.source}`,
          });
        }
        if (!secret) {
          ctx.addIssue({ code: 'custom', message: `AGENT_TOKENS pair "${pair}" empty secret` });
        }
        return { name, secret };
      });
    }),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(50),
  MAX_FILES_PER_UPLOAD: z.coerce.number().int().positive().default(1000),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(
  source: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${messages}`);
  }
  return parsed.data;
}

const BUILD_FALLBACK: Record<string, string> = {
  AUTH_SECRET: 'build-time-stub-not-used-at-runtime-32chars',
  DATA_DIR: '/tmp/markup-build',
};

let cached: Env | null = null;
export function env(): Env {
  if (!cached) {
    // During `next build`, env vars are not available. Return a stub that
    // prevents validation errors at module load; runtime requests will use
    // the real process.env.
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return loadEnv({ ...BUILD_FALLBACK, ...process.env });
    }
    cached = loadEnv();
  }
  return cached;
}

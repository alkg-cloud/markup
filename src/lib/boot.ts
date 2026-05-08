import { seedAgentTokens } from './auth/seed-agent-tokens';
import { env } from './env';
import { logger } from './logger';

let booted = false;

export async function bootOnce() {
  if (booted) return;
  booted = true;
  try {
    await seedAgentTokens(env().AGENT_TOKENS);
    logger.info('boot_complete');
  } catch (err) {
    logger.error({ err: String(err) }, 'boot_failed');
  }
}

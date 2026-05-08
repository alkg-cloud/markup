import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env().LOG_LEVEL,
  base: { service: 'markup' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(env().NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
});

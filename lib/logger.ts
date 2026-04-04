import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

/** Structured logger; avoids raw console in app code. */
export const logger = pino({
  level: isProd ? 'info' : 'debug',
  base: { service: 'neon-usage-dashboard' },
});

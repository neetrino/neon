import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1),
    NEON_API_KEY: z.string().min(1),
    NEON_ORG_ID: z.string().regex(/^[a-z0-9-]{1,60}$/),
    /** Required for `/api/cron/sync-neon-usage` (set on Vercel + local cron tests). */
    CRON_SECRET: z.string().min(16).optional(),
    DASHBOARD_PASSWORD: z.string().optional(),
    JWT_SECRET: z.string().min(32).optional(),
    APP_URL: z.string().url().optional(),
    NEON_PRICING_PLAN: z.enum(['launch', 'scale']).default('launch'),
  VERCEL_TOKEN: z.string().min(1).optional(),
  VERCEL_TEAM_ID: z.string().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.DASHBOARD_PASSWORD && !val.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_SECRET is required when DASHBOARD_PASSWORD is set (session signing).',
        path: ['JWT_SECRET'],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Validated server-side environment. Call only from server/cron routes.
 */
export function getEnv(): Env {
  if (cached) {
    return cached;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return parsed.data;
}

/**
 * Safe subset for routes that only need public config.
 */
export function getPublicEnv(): { hasDashboardAuth: boolean } {
  return {
    hasDashboardAuth: Boolean(process.env.DASHBOARD_PASSWORD?.length),
  };
}

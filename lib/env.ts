import { z } from "zod";
import {
  DEFAULT_SPEND_ALERT_ESCALATION_PERCENT_OF_THRESHOLD,
  DEFAULT_TELEGRAM_SPEND_ALERT_USD,
} from "@/lib/constants/spend-alert-default";

const optionalNonEmptyString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().min(1).optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    NEON_API_KEY: z.string().min(1),
    NEON_ORG_ID: z.string().regex(/^[a-z0-9-]{1,60}$/),
    /** Required for `/api/cron/sync-neon-usage` (set on Vercel + local cron tests). */
    CRON_SECRET: z.string().min(16).optional(),
    DASHBOARD_PASSWORD: z.string().optional(),
    JWT_SECRET: z.string().min(32).optional(),
    APP_URL: z.string().url().optional(),
    NEON_PRICING_PLAN: z.enum(["launch", "scale"]).default("launch"),
    /** Telegram Bot API token; optional — spend alerts disabled if unset. */
    TELEGRAM_BOT_TOKEN: optionalNonEmptyString,
    /** Chat ID (user, group, or channel) to receive spend alerts. */
    TELEGRAM_CHAT_ID: optionalNonEmptyString,
    /** Default USD threshold when a project has no per-project override. */
    TELEGRAM_SPEND_ALERT_DEFAULT_USD: z.preprocess((v) => {
      if (v === undefined || v === null || v === "") {
        return DEFAULT_TELEGRAM_SPEND_ALERT_USD;
      }
      return v;
    }, z.coerce.number().positive()),
    /**
     * Percent of this project’s alert limit (`TELEGRAM_SPEND_ALERT_DEFAULT_USD` or per-project
     * override) required as further spend growth before each additional Telegram alert the same UTC day.
     */
    SPEND_ALERT_ESCALATION_PERCENT_OF_THRESHOLD: z.preprocess((v) => {
      if (v === undefined || v === null || v === "") {
        return DEFAULT_SPEND_ALERT_ESCALATION_PERCENT_OF_THRESHOLD;
      }
      return v;
    }, z.coerce.number().min(0.1).max(100)),
  })
  .superRefine((val, ctx) => {
    if (val.DASHBOARD_PASSWORD && !val.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JWT_SECRET is required when DASHBOARD_PASSWORD is set (session signing).",
        path: ["JWT_SECRET"],
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

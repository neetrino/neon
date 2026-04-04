import { z } from 'zod';

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const vercelProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  framework: z.string().nullable().optional(),
});

export const vercelProjectsResponseSchema = z.object({
  projects: z.array(vercelProjectSchema),
  pagination: z
    .object({
      next: z.number().nullable().optional(),
    })
    .optional(),
});

export type VercelProject = z.infer<typeof vercelProjectSchema>;
export type VercelProjectsResponse = z.infer<typeof vercelProjectsResponseSchema>;

// ---------------------------------------------------------------------------
// FOCUS billing API format — full v1.3 fields
// Endpoint: GET /v1/billing/charges?teamId=...&from=ISO_DATETIME&to=ISO_DATETIME
// Response: NDJSON – one JSON object per line
// ---------------------------------------------------------------------------

export const vercelFocusChargeSchema = z
  .object({
    /** ISO 8601 UTC — inclusive start of charge period (daily: 07:00Z) */
    ChargePeriodStart: z.string(),
    /** ISO 8601 UTC — exclusive end of charge period */
    ChargePeriodEnd: z.string(),
    ServiceName: z.string(),
    /** High-level grouping, e.g. "Build & Deploy", "Vercel Functions", "Subscription Licenses" */
    ServiceCategory: z.string().default('Other'),
    ConsumedQuantity: z.number().default(0),
    ConsumedUnit: z.string().default(''),
    /** Actual amount charged (after committed discounts applied) */
    BilledCost: z.number().default(0),
    /** Amortized cost including discounts and pre-commitment credits */
    EffectiveCost: z.number().default(0),
    Tags: z
      .object({
        ProjectId: z.string().optional(),
        ProjectName: z.string().optional(),
      })
      .default({}),
  })
  .passthrough();

export type VercelFocusCharge = z.infer<typeof vercelFocusChargeSchema>;

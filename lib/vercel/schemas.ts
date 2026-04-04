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
// Normalized internal charge type
// Consumed by sync-vercel-month.ts › accumulateCharge
// ---------------------------------------------------------------------------

export const vercelChargeSchema = z.object({
  /** ServiceName from the FOCUS API (e.g. "Bandwidth", "Fluid Provisioned Memory") */
  resource: z.string(),
  quantity: z.number().default(0),
  /** Billed USD for this line item */
  price: z.number().default(0),
  projectId: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
});

export type VercelCharge = z.infer<typeof vercelChargeSchema>;

// ---------------------------------------------------------------------------
// FOCUS billing API format
// Endpoint: GET /v1/billing/charges?teamId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
// Response: NDJSON – one JSON object per line
// ---------------------------------------------------------------------------

export const vercelFocusChargeSchema = z
  .object({
    ServiceName: z.string(),
    ConsumedQuantity: z.number().default(0),
    /** Actual amount charged (after committed discounts applied) */
    BilledCost: z.number().default(0),
    Tags: z
      .object({
        ProjectId: z.string().optional(),
        ProjectName: z.string().optional(),
      })
      .default({}),
  })
  .passthrough();

export type VercelFocusCharge = z.infer<typeof vercelFocusChargeSchema>;

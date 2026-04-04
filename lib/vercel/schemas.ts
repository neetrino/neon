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
// Billing charges
// Vercel REST API: GET /v2/teams/{teamId}/billing/charges
// Each charge has a resource type, a per-project breakdown, and USD totals.
// ---------------------------------------------------------------------------

export const vercelChargeSchema = z.object({
  /** e.g. "Bandwidth", "Serverless Function Execution", "Edge Function Execution",
   *  "Build Execution", "Image Optimization", "Edge Config" */
  resource: z.string(),
  quantity: z.number().default(0),
  /** Unit label, e.g. "GB", "GB-Hrs", "CPU-ms", "Minutes", "Source Images" */
  unit: z.string().optional(),
  /** USD price per unit */
  unitPrice: z.number().default(0),
  /** Total USD for this charge line */
  price: z.number().default(0),
  projectId: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  period: z.object({
    start: z.number(),
    end: z.number(),
  }),
});

export const vercelBillingResponseSchema = z.object({
  charges: z.array(vercelChargeSchema),
});

export type VercelCharge = z.infer<typeof vercelChargeSchema>;
export type VercelBillingResponse = z.infer<typeof vercelBillingResponseSchema>;

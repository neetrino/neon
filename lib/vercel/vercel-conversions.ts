/**
 * Maps stored serviceCategory (cost bucket) to the Acc field name suffix.
 * Stored as one of: "plan" | "build" | "function" | "bandwidth" | "other"
 */
export const VERCEL_CATEGORY_BUCKETS: Record<
  string,
  'plan' | 'build' | 'function' | 'bandwidth' | 'other'
> = {
  plan: 'plan',
  build: 'build',
  function: 'function',
  bandwidth: 'bandwidth',
  other: 'other',
};

export type VercelProjectCost = {
  bandwidthGb: number;
  bandwidthUsd: number;
  functionGbHours: number;
  functionUsd: number;
  edgeFunctionCpuMs: number;
  edgeFunctionUsd: number;
  buildMinutes: number;
  buildUsd: number;
  imageOptCount: number;
  imageOptUsd: number;
  otherUsd: number;
  totalUsd: number;
};

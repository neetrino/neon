import type { Decimal } from '@prisma/client/runtime/library';

export type VercelPricingPlan = 'hobby' | 'pro' | 'enterprise';

/** Vercel Pro plan pricing (USD). Included allowances are handled server-side by Vercel. */
export const VERCEL_PRICING_RATES = {
  bandwidthPerGbUsd: 0.15,
  functionsPerGbHourUsd: 0.18,
  edgeFunctionsPer1mCpuMsUsd: 2.0,
  buildPer100MinutesUsd: 3.0,
  imageOptPer1000SourcesUsd: 5.0,
  edgeConfigPer1mReadsUsd: 0.15,
} as const;

/** Canonical resource name → category mapping from Vercel billing API. */
export const VERCEL_RESOURCE_CATEGORIES = {
  Bandwidth: 'bandwidth',
  'Serverless Function Execution': 'function',
  'Edge Function Execution': 'edgeFunction',
  'Build Execution': 'build',
  'Image Optimization': 'imageOpt',
  'Edge Config Reads': 'edgeConfig',
} as const;

export type VercelCostCategory = (typeof VERCEL_RESOURCE_CATEGORIES)[keyof typeof VERCEL_RESOURCE_CATEGORIES];

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

export function emptyVercelProjectCost(): VercelProjectCost {
  return {
    bandwidthGb: 0,
    bandwidthUsd: 0,
    functionGbHours: 0,
    functionUsd: 0,
    edgeFunctionCpuMs: 0,
    edgeFunctionUsd: 0,
    buildMinutes: 0,
    buildUsd: 0,
    imageOptCount: 0,
    imageOptUsd: 0,
    otherUsd: 0,
    totalUsd: 0,
  };
}

/** Convert Decimal? fields from Prisma snapshot to plain VercelProjectCost. */
export function snapshotToCost(snapshot: {
  bandwidthGb: Decimal | null;
  bandwidthUsd: Decimal | null;
  functionGbHours: Decimal | null;
  functionUsd: Decimal | null;
  edgeFunctionCpuMs: Decimal | null;
  edgeFunctionUsd: Decimal | null;
  buildMinutes: Decimal | null;
  buildUsd: Decimal | null;
  imageOptCount: number | null;
  imageOptUsd: Decimal | null;
  otherUsd: Decimal | null;
  totalUsd: Decimal | null;
}): VercelProjectCost {
  const d = (v: Decimal | null) => (v ? Number(v) : 0);
  return {
    bandwidthGb: d(snapshot.bandwidthGb),
    bandwidthUsd: d(snapshot.bandwidthUsd),
    functionGbHours: d(snapshot.functionGbHours),
    functionUsd: d(snapshot.functionUsd),
    edgeFunctionCpuMs: d(snapshot.edgeFunctionCpuMs),
    edgeFunctionUsd: d(snapshot.edgeFunctionUsd),
    buildMinutes: d(snapshot.buildMinutes),
    buildUsd: d(snapshot.buildUsd),
    imageOptCount: snapshot.imageOptCount ?? 0,
    imageOptUsd: d(snapshot.imageOptUsd),
    otherUsd: d(snapshot.otherUsd),
    totalUsd: d(snapshot.totalUsd),
  };
}

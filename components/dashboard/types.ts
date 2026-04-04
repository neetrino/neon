import type { NeonUsageMetricName } from '@/lib/constants/neon-metrics';
import type { VercelProjectCost } from '@/lib/vercel/vercel-conversions';

export type { VercelProjectCost };

export type Provider = 'neon' | 'vercel';

export type SeriesPoint = {
  period: string;
  byProject: Record<string, number>;
};

export type UsageSeriesResponse = {
  metric: string;
  groupBy: 'day' | 'month';
  displayUnit: 'cu_hours' | 'avg_gb' | 'gb' | 'branch_months';
  points: SeriesPoint[];
};

export type ProjectRow = {
  /** For Neon: Neon project ID. For Vercel: Vercel project ID. Used as unique key. */
  neonProjectId: string;
  name: string;
  regionId: string | null;
  lastSnapshotDate: string | null;
  provider: Provider;
};

export type SyncRunRow = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  errorMessage: string | null;
  rowsUpserted: number | null;
  targetDate: string;
};

export type NeonUsageAggregate = {
  provider: 'neon';
  neonProjectId: string;
  name: string;
  snapshotRows: number;
  totals: Record<NeonUsageMetricName, string>;
  rawTotals: Record<NeonUsageMetricName, string>;
  normalizedTotals: {
    computeCuHours: number;
    storageByteHours: number;
    historyByteHours: number;
    storageGbMonths: number;
    historyGbMonths: number;
    storageAvgGb: number;
    historyAvgGb: number;
    publicTransferGb: number;
    privateTransferGb: number;
    networkTotalGb: number;
    branchMonths: number;
  };
  estimatedCost: {
    computeUsd: number;
    storageUsd: number;
    historyUsd: number;
    privateTransferUsd: number;
    branchesUsd: number;
    publicTransferRawUsd: number;
    publicTransferGb: number;
    publicTransferBillableGb: number;
    publicTransferUsd: number;
    totalUsd: number;
  };
  averagesPerCalendarDay: Record<NeonUsageMetricName, number>;
  vercelCost: null;
};

export type VercelUsageAggregate = {
  provider: 'vercel';
  neonProjectId: string;
  name: string;
  snapshotRows: number;
  totals: null;
  rawTotals: null;
  normalizedTotals: null;
  estimatedCost: null;
  averagesPerCalendarDay: null;
  vercelCost: VercelProjectCost;
};

export type ProjectUsageAggregate = NeonUsageAggregate | VercelUsageAggregate;

export type CostSummary = {
  neonTotalUsd: number;
  vercelTotalUsd: number;
  grandTotalUsd: number;
  vercelBandwidthUsd: number;
  vercelFunctionsPlusEdgeUsd: number;
  vercelBuildUsd: number;
};

export type VercelBreakdownPoint = {
  period: string;
  bandwidthUsd: number;
  functionsPlusEdgeUsd: number;
  buildUsd: number;
  otherUsd: number;
};

export type VercelSeriesResponse = {
  costByProject: Array<{ period: string; byProject: Record<string, number> }>;
  breakdown: VercelBreakdownPoint[];
  projectNames: Record<string, string>;
};

export type ProjectTotalsResponse = {
  from: string;
  to: string;
  calendarDays: number;
  periodHours: number;
  pricingPlan: 'launch' | 'scale' | null;
  provider: 'neon' | 'vercel' | 'all';
  costSummary: CostSummary;
  pricingRates: {
    computePerCuHourUsd: number;
    storagePerGbMonthUsd: number;
    instantRestorePerGbMonthUsd: number;
    publicTransferPerGbUsd: number;
    privateTransferPerGbUsd: number;
    branchesPerMonthUsd: number;
    includedChildBranchesPerProject: number;
  } | null;
  totals?: {
    snapshotRows: number;
    normalized: {
      computeCuHours: number;
      storageAvgGb: number;
      historyAvgGb: number;
      networkTotalGb: number;
      storageGbMonths: number;
      historyGbMonths: number;
      branchMonths: number;
    };
    cost: {
      computeUsd: number;
      storageUsd: number;
      historyUsd: number;
      privateTransferUsd: number;
      publicTransferUsd: number;
      branchesUsd: number;
      totalUsd: number;
      publicTransferGb: number;
      publicTransferBillableGb: number;
    };
  };
  projects: ProjectUsageAggregate[];
};

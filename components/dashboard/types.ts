import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";

export type SeriesPoint = {
  period: string;
  byProject: Record<string, number>;
};

export type UsageSeriesResponse = {
  metric: string;
  groupBy: "day" | "month";
  displayUnit: "cu_hours" | "avg_gb" | "gb" | "branch_months";
  points: SeriesPoint[];
};

export type ProjectRow = {
  neonProjectId: string;
  name: string;
  regionId: string | null;
  lastSnapshotDate: string | null;
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

export type ProjectUsageAggregate = {
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
};

export type ProjectTotalsResponse = {
  from: string;
  to: string;
  calendarDays: number;
  periodHours: number;
  pricingPlan: "launch" | "scale";
  pricingRates: {
    computePerCuHourUsd: number;
    storagePerGbMonthUsd: number;
    instantRestorePerGbMonthUsd: number;
    publicTransferPerGbUsd: number;
    privateTransferPerGbUsd: number;
    branchesPerMonthUsd: number;
    includedChildBranchesPerProject: number;
  };
  totals: {
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

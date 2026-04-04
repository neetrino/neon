import type { NeonUsageAggregate, CostSummary } from '@/components/dashboard/types';

export type DashboardKpiSums = {
  computeCuHours: number;
  storageAvgGb: number;
  historyAvgGb: number;
  networkTotalGb: number;
  estimatedTotalUsd: number;
};

export function sumDashboardKpis(projects: NeonUsageAggregate[]): DashboardKpiSums {
  return projects.reduce(
    (acc, p) => {
      acc.computeCuHours += p.normalizedTotals.computeCuHours;
      acc.storageAvgGb += p.normalizedTotals.storageAvgGb;
      acc.historyAvgGb += p.normalizedTotals.historyAvgGb;
      acc.networkTotalGb += p.normalizedTotals.networkTotalGb;
      acc.estimatedTotalUsd += p.estimatedCost.totalUsd;
      return acc;
    },
    {
      computeCuHours: 0,
      storageAvgGb: 0,
      historyAvgGb: 0,
      networkTotalGb: 0,
      estimatedTotalUsd: 0,
    },
  );
}

export function formatCuHours(hours: number): string {
  return `${hours.toFixed(2)} CU-hrs`;
}

export function formatGb(value: number): string {
  return `${value.toFixed(2)} GB`;
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function costSummaryFromProjects(
  projects: Array<{
    provider: 'neon' | 'vercel';
    estimatedCost: { totalUsd: number } | null;
    vercelCost: {
      totalUsd: number;
      bandwidthUsd: number;
      functionUsd: number;
      edgeFunctionUsd: number;
      buildUsd: number;
    } | null;
  }>,
): CostSummary {
  let neonTotalUsd = 0;
  let vercelTotalUsd = 0;
  let vercelBandwidthUsd = 0;
  let vercelFunctionsPlusEdgeUsd = 0;
  let vercelBuildUsd = 0;
  for (const p of projects) {
    if (p.provider === 'neon') {
      neonTotalUsd += p.estimatedCost?.totalUsd ?? 0;
    } else {
      vercelTotalUsd += p.vercelCost?.totalUsd ?? 0;
      vercelBandwidthUsd += p.vercelCost?.bandwidthUsd ?? 0;
      vercelFunctionsPlusEdgeUsd +=
        (p.vercelCost?.functionUsd ?? 0) + (p.vercelCost?.edgeFunctionUsd ?? 0);
      vercelBuildUsd += p.vercelCost?.buildUsd ?? 0;
    }
  }
  return {
    neonTotalUsd,
    vercelTotalUsd,
    grandTotalUsd: neonTotalUsd + vercelTotalUsd,
    vercelBandwidthUsd,
    vercelFunctionsPlusEdgeUsd,
    vercelBuildUsd,
  };
}

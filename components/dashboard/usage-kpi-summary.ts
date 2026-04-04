import type { ProjectUsageAggregate } from '@/components/dashboard/types';

export type DashboardKpiSums = {
  computeCuHours: number;
  storageAvgGb: number;
  historyAvgGb: number;
  networkTotalGb: number;
  estimatedTotalUsd: number;
};

export function sumDashboardKpis(projects: ProjectUsageAggregate[]): DashboardKpiSums {
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

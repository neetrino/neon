import type { NeonUsageMetricName } from '@/lib/constants/neon-metrics';
import { NEON_USAGE_METRICS } from '@/lib/constants/neon-metrics';
import type { ProjectRow, ProjectUsageAggregate } from '@/components/dashboard/types';

export const PROJECT_TABLE_METRICS: NeonUsageMetricName[] = NEON_USAGE_METRICS.filter(
  (m) => m !== 'compute_unit_seconds',
);

export function formatAvgPerDay(n: number): string {
  if (!Number.isFinite(n)) {
    return '—';
  }
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function aggregateFor(
  usageByProjectId: Map<string, ProjectUsageAggregate> | null,
  id: string,
): ProjectUsageAggregate | undefined {
  return usageByProjectId?.get(id);
}

function totalCostFor(agg: ProjectUsageAggregate | undefined): number {
  if (!agg) return 0;
  if (agg.provider === 'vercel') return agg.vercelCost.totalUsd;
  return agg.estimatedCost.totalUsd;
}

export function sortProjectsByEstimatedCost(
  projects: ProjectRow[],
  usageByProjectId: Map<string, ProjectUsageAggregate> | null,
): ProjectRow[] {
  return [...projects].sort((a, b) => {
    const costA = totalCostFor(usageByProjectId?.get(a.neonProjectId));
    const costB = totalCostFor(usageByProjectId?.get(b.neonProjectId));
    if (costB !== costA) {
      return costB - costA;
    }
    return a.name.localeCompare(b.name);
  });
}

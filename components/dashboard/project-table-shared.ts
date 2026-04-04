import type { NeonUsageMetricName } from '@/lib/constants/neon-metrics';
import { NEON_USAGE_METRICS } from '@/lib/constants/neon-metrics';
import type { ProjectRow } from '@/components/dashboard/types';
import type { ProjectUsageAggregate } from '@/components/dashboard/types';

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

export function sortProjectsByEstimatedCost(
  projects: ProjectRow[],
  usageByProjectId: Map<string, ProjectUsageAggregate> | null,
): ProjectRow[] {
  return [...projects].sort((a, b) => {
    const costA = usageByProjectId?.get(a.neonProjectId)?.estimatedCost.totalUsd ?? 0;
    const costB = usageByProjectId?.get(b.neonProjectId)?.estimatedCost.totalUsd ?? 0;
    if (costB !== costA) {
      return costB - costA;
    }
    return a.name.localeCompare(b.name);
  });
}

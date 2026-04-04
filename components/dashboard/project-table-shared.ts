import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";
import { NEON_USAGE_METRICS } from "@/lib/constants/neon-metrics";
import type { ProjectUsageAggregate } from "@/components/dashboard/types";

export const PROJECT_TABLE_METRICS: NeonUsageMetricName[] = NEON_USAGE_METRICS.filter(
  (m) => m !== "compute_unit_seconds",
);

export function formatAvgPerDay(n: number): string {
  if (!Number.isFinite(n)) {
    return "—";
  }
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function aggregateFor(
  usageByProjectId: Map<string, ProjectUsageAggregate> | null,
  id: string,
): ProjectUsageAggregate | undefined {
  return usageByProjectId?.get(id);
}

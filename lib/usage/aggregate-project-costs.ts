import type { UsageSnapshot } from "@prisma/client";
import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";
import { NEON_USAGE_METRICS } from "@/lib/constants/neon-metrics";
import { isIgnoredProjectId } from "@/lib/constants/ignored-projects";
import { readMetricValue } from "@/lib/usage/metric-field";
import {
  applyPublicTransferAllowance,
  estimateProjectCost,
  normalizeTotals,
  periodHoursFromCalendarDays,
  PRICING_RATES,
  toJsonTotals,
  type EstimatedProjectCost,
  type PricingPlan,
} from "@/lib/usage/neon-conversions";
import type { ProjectUsageAggregate } from "@/components/dashboard/types";

type MetricTotals = Record<NeonUsageMetricName, bigint>;

export type UsageSnapshotWithProject = UsageSnapshot & { project: { name: string } };

function emptyTotals(): MetricTotals {
  return {
    compute_unit_seconds: 0n,
    root_branch_bytes_month: 0n,
    child_branch_bytes_month: 0n,
    instant_restore_bytes_month: 0n,
    public_network_transfer_bytes: 0n,
    private_network_transfer_bytes: 0n,
    extra_branches_month: 0n,
  };
}

function calendarDaysInclusive(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.max(1, Math.floor((b - a) / 86_400_000) + 1);
}

function avgPerDay(total: bigint, days: number): number {
  const n = Number(total);
  if (!Number.isFinite(n)) {
    return total > 0n ? Number.MAX_SAFE_INTEGER / Math.max(1, days) : 0;
  }
  return n / Math.max(1, days);
}

/**
 * Aggregates usage snapshots into per-project cost rows (same formulas as `/api/usage/project-totals`).
 */
export function aggregateSnapshotsToProjectUsage(
  rows: UsageSnapshotWithProject[],
  fromDate: Date,
  toDate: Date,
  pricingPlan: PricingPlan,
): ProjectUsageAggregate[] {
  if (fromDate > toDate) {
    return [];
  }

  const days = calendarDaysInclusive(fromDate, toDate);
  const periodHours = periodHoursFromCalendarDays(days);
  const pricingRates = PRICING_RATES[pricingPlan];

  type Acc = {
    neonProjectId: string;
    name: string;
    snapshotRows: number;
    totals: MetricTotals;
  };

  const byProject = new Map<string, Acc>();

  for (const row of rows) {
    const id = row.neonProjectId;
    if (isIgnoredProjectId(id)) {
      continue;
    }
    let acc = byProject.get(id);
    if (!acc) {
      acc = {
        neonProjectId: id,
        name: row.project.name,
        snapshotRows: 0,
        totals: emptyTotals(),
      };
      byProject.set(id, acc);
    }
    acc.snapshotRows += 1;
    for (const m of NEON_USAGE_METRICS) {
      const v = readMetricValue(row, m);
      if (v !== null) {
        acc.totals[m] += v;
      }
    }
  }

  const projects = [...byProject.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => {
      const rawTotals = toJsonTotals(p.totals);

      const averagesPerCalendarDay = Object.fromEntries(
        NEON_USAGE_METRICS.map((m) => [m, avgPerDay(p.totals[m], days)]),
      ) as Record<NeonUsageMetricName, number>;

      const normalizedTotals = normalizeTotals(p.totals, periodHours);
      const estimatedCost = estimateProjectCost(
        p.totals,
        normalizedTotals,
        pricingRates,
        periodHours,
      );

      return {
        neonProjectId: p.neonProjectId,
        name: p.name,
        snapshotRows: p.snapshotRows,
        totals: rawTotals,
        rawTotals,
        normalizedTotals,
        estimatedCost,
        averagesPerCalendarDay,
      };
    });

  applyPublicTransferAllowance(
    projects as Array<{ estimatedCost: EstimatedProjectCost }>,
    pricingRates,
  );

  return projects;
}

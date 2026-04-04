import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { parseIsoDateOnly } from "@/lib/dates";
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
} from "@/lib/usage/neon-conversions";

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type MetricTotals = Record<NeonUsageMetricName, bigint>;

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { from, to } = parsed.data;
  const fromDate = parseIsoDateOnly(from);
  const toDate = parseIsoDateOnly(to);

  if (fromDate > toDate) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const days = calendarDaysInclusive(fromDate, toDate);
  const periodHours = periodHoursFromCalendarDays(days);
  const env = getEnv();
  const pricingPlan = env.NEON_PRICING_PLAN;
  const pricingRates = PRICING_RATES[pricingPlan];

  const rows = await prisma.usageSnapshot.findMany({
    where: { snapshotDate: { gte: fromDate, lte: toDate } },
    include: { project: { select: { name: true } } },
    orderBy: [{ neonProjectId: "asc" }, { snapshotDate: "asc" }],
  });

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

  const totals = projects.reduce(
    (acc, p) => {
      acc.snapshotRows += p.snapshotRows;
      acc.normalized.computeCuHours += p.normalizedTotals.computeCuHours;
      acc.normalized.storageAvgGb += p.normalizedTotals.storageAvgGb;
      acc.normalized.historyAvgGb += p.normalizedTotals.historyAvgGb;
      acc.normalized.networkTotalGb += p.normalizedTotals.networkTotalGb;
      acc.normalized.storageGbMonths += p.normalizedTotals.storageGbMonths;
      acc.normalized.historyGbMonths += p.normalizedTotals.historyGbMonths;
      acc.normalized.branchMonths += p.normalizedTotals.branchMonths;
      acc.cost.computeUsd += p.estimatedCost.computeUsd;
      acc.cost.storageUsd += p.estimatedCost.storageUsd;
      acc.cost.historyUsd += p.estimatedCost.historyUsd;
      acc.cost.privateTransferUsd += p.estimatedCost.privateTransferUsd;
      acc.cost.publicTransferUsd += p.estimatedCost.publicTransferUsd;
      acc.cost.branchesUsd += p.estimatedCost.branchesUsd;
      acc.cost.totalUsd += p.estimatedCost.totalUsd;
      acc.cost.publicTransferGb += p.estimatedCost.publicTransferGb;
      acc.cost.publicTransferBillableGb += p.estimatedCost.publicTransferBillableGb;
      return acc;
    },
    {
      snapshotRows: 0,
      normalized: {
        computeCuHours: 0,
        storageAvgGb: 0,
        historyAvgGb: 0,
        networkTotalGb: 0,
        storageGbMonths: 0,
        historyGbMonths: 0,
        branchMonths: 0,
      },
      cost: {
        computeUsd: 0,
        storageUsd: 0,
        historyUsd: 0,
        privateTransferUsd: 0,
        publicTransferUsd: 0,
        branchesUsd: 0,
        totalUsd: 0,
        publicTransferGb: 0,
        publicTransferBillableGb: 0,
      },
    },
  );

  return NextResponse.json({
    from,
    to,
    calendarDays: days,
    periodHours,
    pricingPlan,
    pricingRates,
    totals,
    projects,
  });
}

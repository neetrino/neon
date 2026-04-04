import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseIsoDateOnly } from "@/lib/dates";
import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";
import { NEON_USAGE_METRICS } from "@/lib/constants/neon-metrics";
import { metricToSafeNumber, readMetricValue } from "@/lib/usage/metric-field";

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

function bigintToJsonString(value: bigint): string {
  return value.toString();
}

function avgPerDay(total: bigint, days: number): number {
  return metricToSafeNumber(total) / days;
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
      const totalsStr = Object.fromEntries(
        NEON_USAGE_METRICS.map((m) => [m, bigintToJsonString(p.totals[m])]),
      ) as Record<NeonUsageMetricName, string>;

      const averagesPerCalendarDay = Object.fromEntries(
        NEON_USAGE_METRICS.map((m) => [m, avgPerDay(p.totals[m], days)]),
      ) as Record<NeonUsageMetricName, number>;

      return {
        neonProjectId: p.neonProjectId,
        name: p.name,
        snapshotRows: p.snapshotRows,
        totals: totalsStr,
        averagesPerCalendarDay,
      };
    });

  return NextResponse.json({
    from,
    to,
    calendarDays: days,
    projects,
  });
}

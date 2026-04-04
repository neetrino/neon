import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseIsoDateOnly } from "@/lib/dates";
import {
  NEON_USAGE_METRICS,
  type NeonUsageMetricName,
} from "@/lib/constants/neon-metrics";
import { isIgnoredProjectId } from "@/lib/constants/ignored-projects";
import { metricToSafeNumber, readMetricValue } from "@/lib/usage/metric-field";
import {
  BILLING_HOURS_PER_MONTH,
  BYTES_PER_DECIMAL_GB,
  SECONDS_PER_HOUR,
} from "@/lib/usage/neon-conversions";

function isNeonUsageMetric(m: string): m is NeonUsageMetricName {
  return (NEON_USAGE_METRICS as readonly string[]).includes(m);
}

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  metric: z.string().refine(isNeonUsageMetric, "Invalid metric"),
  groupBy: z.enum(["day", "month"]).default("day"),
  projectId: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
});

function monthKey(isoDay: string): string {
  return isoDay.slice(0, 7);
}

function daysInMonthFromKey(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function toDisplayValue(metric: NeonUsageMetricName, rawValue: number, periodHours: number): number {
  if (metric === "compute_unit_seconds") {
    return rawValue / SECONDS_PER_HOUR;
  }
  if (
    metric === "root_branch_bytes_month" ||
    metric === "child_branch_bytes_month" ||
    metric === "instant_restore_bytes_month"
  ) {
    return rawValue / Math.max(1, periodHours) / BYTES_PER_DECIMAL_GB;
  }
  if (
    metric === "public_network_transfer_bytes" ||
    metric === "private_network_transfer_bytes"
  ) {
    return rawValue / BYTES_PER_DECIMAL_GB;
  }
  return rawValue / BILLING_HOURS_PER_MONTH;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { from, to, metric, groupBy, projectId } = parsed.data;
  const fromDate = parseIsoDateOnly(from);
  const toDate = parseIsoDateOnly(to);

  if (fromDate > toDate) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const rows = await prisma.usageSnapshot.findMany({
    where: {
      snapshotDate: { gte: fromDate, lte: toDate },
      ...(projectId ? { neonProjectId: projectId } : {}),
    },
    include: { project: { select: { name: true } } },
    orderBy: { snapshotDate: "asc" },
  });

  type Point = { period: string; byProject: Record<string, number>; periodHours: number };
  const map = new Map<string, Point>();

  for (const row of rows) {
    if (isIgnoredProjectId(row.neonProjectId)) {
      continue;
    }
    const day = row.snapshotDate.toISOString().slice(0, 10);
    const period = groupBy === "month" ? monthKey(day) : day;
    const periodHours = groupBy === "month" ? daysInMonthFromKey(period) * 24 : 24;
    const key = period;
    let slot = map.get(key);
    if (!slot) {
      slot = { period, byProject: {}, periodHours };
      map.set(key, slot);
    }
    const raw = metricToSafeNumber(
      readMetricValue(row, metric as NeonUsageMetricName),
    );
    const v = toDisplayValue(metric as NeonUsageMetricName, raw, slot.periodHours);
    const pid = row.neonProjectId;
    slot.byProject[pid] = (slot.byProject[pid] ?? 0) + v;
  }

  const points = [...map.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((p) => ({ period: p.period, byProject: p.byProject }));

  return NextResponse.json({
    metric: metric as NeonUsageMetricName,
    groupBy,
    displayUnit:
      metric === "compute_unit_seconds"
        ? "cu_hours"
        : metric === "public_network_transfer_bytes" || metric === "private_network_transfer_bytes"
          ? "gb"
          : metric === "extra_branches_month"
            ? "branch_months"
            : "avg_gb",
    points,
  });
}

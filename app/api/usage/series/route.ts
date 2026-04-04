import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseIsoDateOnly } from "@/lib/dates";
import {
  NEON_USAGE_METRICS,
  type NeonUsageMetricName,
} from "@/lib/constants/neon-metrics";
import { metricToSafeNumber, readMetricValue } from "@/lib/usage/metric-field";

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

  type Point = { period: string; byProject: Record<string, number> };
  const map = new Map<string, Point>();

  for (const row of rows) {
    const day = row.snapshotDate.toISOString().slice(0, 10);
    const period = groupBy === "month" ? monthKey(day) : day;
    const key = period;
    let slot = map.get(key);
    if (!slot) {
      slot = { period, byProject: {} };
      map.set(key, slot);
    }
    const v = metricToSafeNumber(
      readMetricValue(row, metric as NeonUsageMetricName),
    );
    const pid = row.neonProjectId;
    slot.byProject[pid] = (slot.byProject[pid] ?? 0) + v;
  }

  const points = [...map.values()].sort((a, b) => a.period.localeCompare(b.period));

  return NextResponse.json({
    metric: metric as NeonUsageMetricName,
    groupBy,
    points,
  });
}

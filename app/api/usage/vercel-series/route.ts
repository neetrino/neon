import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { parseIsoDateOnly } from '@/lib/dates';
import { snapshotToCost } from '@/lib/vercel/vercel-conversions';
import type { VercelBreakdownPoint, VercelSeriesResponse } from '@/components/dashboard/types';

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
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
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  const snapshots = await prisma.vercelUsageSnapshot.findMany({
    where: { snapshotDate: { gte: fromDate, lte: toDate } },
    include: { project: { select: { name: true } } },
    orderBy: [{ snapshotDate: 'asc' }],
  });

  const projectNames: Record<string, string> = {};
  const costByPeriod = new Map<string, Record<string, number>>();
  const breakdownByPeriod = new Map<string, VercelBreakdownPoint>();

  for (const row of snapshots) {
    const pid = row.vercelProjectId;
    const period = monthKey(row.snapshotDate);
    projectNames[pid] = row.project.name;

    const cost = snapshotToCost(row);

    // Chart 1: total cost per project per month
    let byProject = costByPeriod.get(period);
    if (!byProject) {
      byProject = {};
      costByPeriod.set(period, byProject);
    }
    byProject[pid] = (byProject[pid] ?? 0) + cost.totalUsd;

    // Chart 2: category breakdown per month (aggregated across projects)
    let bp = breakdownByPeriod.get(period);
    if (!bp) {
      bp = { period, bandwidthUsd: 0, functionsPlusEdgeUsd: 0, buildUsd: 0, otherUsd: 0 };
      breakdownByPeriod.set(period, bp);
    }
    bp.bandwidthUsd += cost.bandwidthUsd;
    bp.functionsPlusEdgeUsd += cost.functionUsd + cost.edgeFunctionUsd;
    bp.buildUsd += cost.buildUsd;
    bp.otherUsd += cost.imageOptUsd + cost.otherUsd;
  }

  const sortedPeriods = [...costByPeriod.keys()].sort();

  const costByProject = sortedPeriods.map((period) => ({
    period,
    byProject: costByPeriod.get(period) ?? {},
  }));

  const breakdown = sortedPeriods.map((period) => breakdownByPeriod.get(period)!);

  const response: VercelSeriesResponse = { costByProject, breakdown, projectNames };
  return NextResponse.json(response);
}

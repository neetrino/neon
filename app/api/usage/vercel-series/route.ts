import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { parseIsoDateOnly } from '@/lib/dates';
import type { VercelBreakdownPoint, VercelSeriesResponse } from '@/components/dashboard/types';

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** "day" for daily resolution, "month" for monthly aggregation (default: auto). */
  groupBy: z.enum(['day', 'month']).optional(),
});

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
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

  // Auto groupBy: daily for <= 90 days, monthly for longer ranges
  const totalDays = daysBetween(fromDate, toDate);
  const groupBy = parsed.data.groupBy ?? (totalDays <= 90 ? 'day' : 'month');

  const [charges, allProjects] = await Promise.all([
    prisma.vercelDailyCharge.findMany({
      where: { chargeDate: { gte: fromDate, lte: toDate } },
      orderBy: [{ chargeDate: 'asc' }, { vercelProjectId: 'asc' }],
    }),
    prisma.vercelProject.findMany({ select: { vercelProjectId: true, name: true } }),
  ]);

  const projectNames: Record<string, string> = {};
  for (const p of allProjects) {
    projectNames[p.vercelProjectId] = p.name;
  }

  function periodKey(date: Date): string {
    const iso = date.toISOString();
    return groupBy === 'day' ? iso.slice(0, 10) : iso.slice(0, 7);
  }

  // Chart 1: total billed cost per project per period (project-level only, exclude team)
  const costByPeriod = new Map<string, Record<string, number>>();
  // Chart 2: category breakdown per period (all charges including team-level)
  const breakdownByPeriod = new Map<string, VercelBreakdownPoint>();

  for (const row of charges) {
    const period = periodKey(row.chargeDate);
    const usd = Number(row.billedCost);

    // Project cost line chart
    if (row.vercelProjectId !== '') {
      let byProject = costByPeriod.get(period);
      if (!byProject) {
        byProject = {};
        costByPeriod.set(period, byProject);
      }
      byProject[row.vercelProjectId] = (byProject[row.vercelProjectId] ?? 0) + usd;
    }

    // Category breakdown
    let bp = breakdownByPeriod.get(period);
    if (!bp) {
      bp = { period, bandwidthUsd: 0, functionsPlusEdgeUsd: 0, buildUsd: 0, otherUsd: 0 };
      breakdownByPeriod.set(period, bp);
    }
    switch (row.serviceCategory) {
      case 'bandwidth':
        bp.bandwidthUsd += usd;
        break;
      case 'function':
        bp.functionsPlusEdgeUsd += usd;
        break;
      case 'build':
        bp.buildUsd += usd;
        break;
      default:
        bp.otherUsd += usd;
    }
  }

  const sortedPeriods = [...new Set([...costByPeriod.keys(), ...breakdownByPeriod.keys()])].sort();

  const costByProject = sortedPeriods.map((period) => ({
    period,
    byProject: costByPeriod.get(period) ?? {},
  }));

  const breakdown: VercelBreakdownPoint[] = sortedPeriods.map(
    (period) =>
      breakdownByPeriod.get(period) ?? {
        period,
        bandwidthUsd: 0,
        functionsPlusEdgeUsd: 0,
        buildUsd: 0,
        otherUsd: 0,
      },
  );

  const response: VercelSeriesResponse = { costByProject, breakdown, projectNames };
  return NextResponse.json(response);
}

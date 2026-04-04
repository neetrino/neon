import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getEnv } from '@/lib/env';
import { parseIsoDateOnly } from '@/lib/dates';
import type { NeonUsageMetricName } from '@/lib/constants/neon-metrics';
import { NEON_USAGE_METRICS } from '@/lib/constants/neon-metrics';
import { isIgnoredProjectId } from '@/lib/constants/ignored-projects';
import { readMetricValue } from '@/lib/usage/metric-field';
import {
  applyPublicTransferAllowance,
  estimateProjectCost,
  normalizeTotals,
  periodHoursFromCalendarDays,
  PRICING_RATES,
  toJsonTotals,
  type EstimatedProjectCost,
} from '@/lib/usage/neon-conversions';
import { VERCEL_CATEGORY_BUCKETS } from '@/lib/vercel/vercel-conversions';

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  provider: z.enum(['neon', 'vercel', 'all']).default('neon'),
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

async function buildNeonProjects(fromDate: Date, toDate: Date, days: number) {
  const env = getEnv();
  const pricingPlan = env.NEON_PRICING_PLAN;
  const pricingRates = PRICING_RATES[pricingPlan];
  const periodHours = periodHoursFromCalendarDays(days);

  const rows = await prisma.usageSnapshot.findMany({
    where: { snapshotDate: { gte: fromDate, lte: toDate } },
    include: { project: { select: { name: true } } },
    orderBy: [{ neonProjectId: 'asc' }, { snapshotDate: 'asc' }],
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
    if (isIgnoredProjectId(id)) continue;
    let acc = byProject.get(id);
    if (!acc) {
      acc = { neonProjectId: id, name: row.project.name, snapshotRows: 0, totals: emptyTotals() };
      byProject.set(id, acc);
    }
    acc.snapshotRows += 1;
    for (const m of NEON_USAGE_METRICS) {
      const v = readMetricValue(row, m);
      if (v !== null) acc.totals[m] += v;
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
        provider: 'neon' as const,
        neonProjectId: p.neonProjectId,
        name: p.name,
        snapshotRows: p.snapshotRows,
        totals: rawTotals,
        rawTotals,
        normalizedTotals,
        estimatedCost,
        averagesPerCalendarDay,
        vercelCost: null,
      };
    });

  applyPublicTransferAllowance(
    projects as Array<{ estimatedCost: EstimatedProjectCost }>,
    pricingRates,
  );

  return { projects, periodHours, pricingPlan, pricingRates };
}

type ProjectCostAcc = {
  name: string;
  chargeRows: number;
  buildUsd: number;
  functionUsd: number;
  bandwidthUsd: number;
  planUsd: number;
  otherUsd: number;
};

async function buildVercelProjects(fromDate: Date, toDate: Date) {
  const [charges, allProjects] = await Promise.all([
    prisma.vercelDailyCharge.findMany({
      where: {
        chargeDate: { gte: fromDate, lte: toDate },
        vercelProjectId: { not: '' },
      },
      orderBy: [{ vercelProjectId: 'asc' }, { chargeDate: 'asc' }],
    }),
    prisma.vercelProject.findMany({ select: { vercelProjectId: true, name: true } }),
  ]);

  const projectNames = new Map(allProjects.map((p) => [p.vercelProjectId, p.name]));

  const byProject = new Map<string, ProjectCostAcc>();

  for (const row of charges) {
    const id = row.vercelProjectId;
    let acc = byProject.get(id);
    if (!acc) {
      acc = {
        name: projectNames.get(id) ?? id,
        chargeRows: 0,
        buildUsd: 0,
        functionUsd: 0,
        bandwidthUsd: 0,
        planUsd: 0,
        otherUsd: 0,
      };
      byProject.set(id, acc);
    }
    acc.chargeRows += 1;
    const usd = Number(row.billedCost);
    const bucket = VERCEL_CATEGORY_BUCKETS[row.serviceCategory] ?? 'other';
    acc[`${bucket}Usd`] += usd;
  }

  return [...byProject.entries()]
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([projectId, p]) => {
      const totalUsd = p.buildUsd + p.functionUsd + p.bandwidthUsd + p.planUsd + p.otherUsd;
      return {
        provider: 'vercel' as const,
        neonProjectId: projectId,
        name: p.name,
        snapshotRows: p.chargeRows,
        totals: null,
        rawTotals: null,
        normalizedTotals: null,
        estimatedCost: null,
        averagesPerCalendarDay: null,
        vercelCost: {
          bandwidthGb: 0,
          bandwidthUsd: p.bandwidthUsd,
          functionGbHours: 0,
          functionUsd: p.functionUsd,
          edgeFunctionCpuMs: 0,
          edgeFunctionUsd: 0,
          buildMinutes: 0,
          buildUsd: p.buildUsd,
          imageOptCount: 0,
          imageOptUsd: 0,
          otherUsd: p.otherUsd,
          totalUsd,
        },
      };
    });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { from, to, provider } = parsed.data;
  const fromDate = parseIsoDateOnly(from);
  const toDate = parseIsoDateOnly(to);

  if (fromDate > toDate) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  const days = calendarDaysInclusive(fromDate, toDate);

  const [neonResult, vercelProjects, invoices] = await Promise.all([
    provider !== 'vercel' ? buildNeonProjects(fromDate, toDate, days) : null,
    provider !== 'neon' ? buildVercelProjects(fromDate, toDate) : null,
    // Invoices issued within the selected date range (issuedAt covers the period ending on that date)
    provider !== 'neon'
      ? prisma.vercelInvoice.findMany({
          where: { issuedAt: { gte: fromDate, lte: new Date(toDate.getTime() + 86_400_000) } },
          orderBy: { issuedAt: 'asc' },
        })
      : null,
  ]);

  const allProjects = [...(neonResult?.projects ?? []), ...(vercelProjects ?? [])];

  const neonTotal = (neonResult?.projects ?? []).reduce(
    (sum, p) => sum + (p.estimatedCost?.totalUsd ?? 0),
    0,
  );
  const vercelProjectsTotal = (vercelProjects ?? []).reduce(
    (sum, p) => sum + (p.vercelCost?.totalUsd ?? 0),
    0,
  );
  const vercelBandwidthUsd = (vercelProjects ?? []).reduce(
    (sum, p) => sum + (p.vercelCost?.bandwidthUsd ?? 0),
    0,
  );
  const vercelFunctionsPlusEdgeUsd = (vercelProjects ?? []).reduce(
    (sum, p) => sum + (p.vercelCost?.functionUsd ?? 0),
    0,
  );
  const vercelBuildUsd = (vercelProjects ?? []).reduce(
    (sum, p) => sum + (p.vercelCost?.buildUsd ?? 0),
    0,
  );

  // Use authoritative invoice data for plan subscription fee
  const vercelPlanUsd = (invoices ?? []).reduce((sum, inv) => sum + Number(inv.platformFeeUsd), 0);

  const vercelTotalUsd = vercelProjectsTotal + vercelPlanUsd;

  return NextResponse.json({
    from,
    to,
    calendarDays: days,
    periodHours: neonResult?.periodHours ?? periodHoursFromCalendarDays(days),
    pricingPlan: neonResult?.pricingPlan ?? null,
    pricingRates: neonResult?.pricingRates ?? null,
    provider,
    costSummary: {
      neonTotalUsd: neonTotal,
      vercelTotalUsd,
      grandTotalUsd: neonTotal + vercelTotalUsd,
      vercelBandwidthUsd,
      vercelFunctionsPlusEdgeUsd,
      vercelBuildUsd,
      vercelPlanUsd,
      vercelInvoiceCount: (invoices ?? []).length,
    },
    projects: allProjects,
  });
}

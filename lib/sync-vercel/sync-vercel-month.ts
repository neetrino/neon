import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { listAllVercelProjects } from '@/lib/vercel/list-projects';
import {
  fetchVercelCharges,
  billingPeriodForDate,
  periodStartDate,
} from '@/lib/vercel/fetch-charges';
import { withBackoff } from '@/lib/sync/retry';
import type { VercelCharge } from '@/lib/vercel/schemas';
import { Prisma } from '@prisma/client';

type SyncParams = {
  token: string;
  teamId: string;
  /** Any UTC date within the billing month to sync. */
  targetDay: Date;
};

type ProjectAccumulator = {
  bandwidthGb: number;
  bandwidthUsd: number;
  functionGbHours: number;
  functionUsd: number;
  edgeFunctionCpuMs: number;
  edgeFunctionUsd: number;
  buildMinutes: number;
  buildUsd: number;
  imageOptCount: number;
  imageOptUsd: number;
  otherUsd: number;
};

function emptyAcc(): ProjectAccumulator {
  return {
    bandwidthGb: 0,
    bandwidthUsd: 0,
    functionGbHours: 0,
    functionUsd: 0,
    edgeFunctionCpuMs: 0,
    edgeFunctionUsd: 0,
    buildMinutes: 0,
    buildUsd: 0,
    imageOptCount: 0,
    imageOptUsd: 0,
    otherUsd: 0,
  };
}

function accumulateCharge(acc: ProjectAccumulator, charge: VercelCharge): void {
  const resource = charge.resource.toLowerCase();

  if (resource.includes('bandwidth')) {
    acc.bandwidthGb += charge.quantity;
    acc.bandwidthUsd += charge.price;
  } else if (
    resource.includes('serverless function') ||
    resource.includes('function execution') ||
    // "Fluid Provisioned Memory" / "Fluid Provisioned vCPU" — Vercel Fluid compute
    resource.includes('fluid')
  ) {
    acc.functionGbHours += charge.quantity;
    acc.functionUsd += charge.price;
  } else if (resource.includes('edge function')) {
    acc.edgeFunctionCpuMs += charge.quantity;
    acc.edgeFunctionUsd += charge.price;
  } else if (resource.includes('build')) {
    acc.buildMinutes += charge.quantity;
    acc.buildUsd += charge.price;
  } else if (resource.includes('image')) {
    acc.imageOptCount += Math.round(charge.quantity);
    acc.imageOptUsd += charge.price;
  } else {
    acc.otherUsd += charge.price;
  }
}

function toPrismaDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(6));
}

/**
 * Syncs Vercel billing charges for the billing month containing `targetDay`.
 * Upserts one VercelUsageSnapshot per project per month.
 */
export async function syncVercelForMonth(params: SyncParams): Promise<{ rows: number }> {
  const period = billingPeriodForDate(params.targetDay);
  const snapshotDate = periodStartDate(period);

  const projects = await withBackoff('vercelListProjects', () =>
    listAllVercelProjects({ token: params.token, teamId: params.teamId }),
  );

  for (const p of projects) {
    await prisma.vercelProject.upsert({
      where: { vercelProjectId: p.id },
      create: { vercelProjectId: p.id, name: p.name, framework: p.framework ?? null },
      update: { name: p.name, framework: p.framework ?? null },
    });
  }

  const charges = await withBackoff('vercelFetchCharges', () =>
    fetchVercelCharges({ token: params.token, teamId: params.teamId, period }),
  );

  const byProject = new Map<string, ProjectAccumulator>();
  let teamPlanUsd = 0;
  let teamOtherUsd = 0;

  for (const charge of charges) {
    if (!charge.projectId) {
      if (charge.resource.toLowerCase() === 'pro') {
        teamPlanUsd += charge.price;
      } else {
        teamOtherUsd += charge.price;
      }
      continue;
    }
    let acc = byProject.get(charge.projectId);
    if (!acc) {
      acc = emptyAcc();
      byProject.set(charge.projectId, acc);
    }
    accumulateCharge(acc, charge);
  }

  let rows = 0;

  for (const [projectId, acc] of byProject.entries()) {
    const projectExists = await prisma.vercelProject.findUnique({
      where: { vercelProjectId: projectId },
    });
    if (!projectExists) {
      continue;
    }

    const totalUsd =
      acc.bandwidthUsd +
      acc.functionUsd +
      acc.edgeFunctionUsd +
      acc.buildUsd +
      acc.imageOptUsd +
      acc.otherUsd;

    await prisma.vercelUsageSnapshot.upsert({
      where: { vercelProjectId_snapshotDate: { vercelProjectId: projectId, snapshotDate } },
      create: {
        vercelProjectId: projectId,
        snapshotDate,
        bandwidthGb: toPrismaDecimal(acc.bandwidthGb),
        bandwidthUsd: toPrismaDecimal(acc.bandwidthUsd),
        functionGbHours: toPrismaDecimal(acc.functionGbHours),
        functionUsd: toPrismaDecimal(acc.functionUsd),
        edgeFunctionCpuMs: toPrismaDecimal(acc.edgeFunctionCpuMs),
        edgeFunctionUsd: toPrismaDecimal(acc.edgeFunctionUsd),
        buildMinutes: toPrismaDecimal(acc.buildMinutes),
        buildUsd: toPrismaDecimal(acc.buildUsd),
        imageOptCount: acc.imageOptCount,
        imageOptUsd: toPrismaDecimal(acc.imageOptUsd),
        otherUsd: toPrismaDecimal(acc.otherUsd),
        totalUsd: toPrismaDecimal(totalUsd),
      },
      update: {
        bandwidthGb: toPrismaDecimal(acc.bandwidthGb),
        bandwidthUsd: toPrismaDecimal(acc.bandwidthUsd),
        functionGbHours: toPrismaDecimal(acc.functionGbHours),
        functionUsd: toPrismaDecimal(acc.functionUsd),
        edgeFunctionCpuMs: toPrismaDecimal(acc.edgeFunctionCpuMs),
        edgeFunctionUsd: toPrismaDecimal(acc.edgeFunctionUsd),
        buildMinutes: toPrismaDecimal(acc.buildMinutes),
        buildUsd: toPrismaDecimal(acc.buildUsd),
        imageOptCount: acc.imageOptCount,
        imageOptUsd: toPrismaDecimal(acc.imageOptUsd),
        otherUsd: toPrismaDecimal(acc.otherUsd),
        totalUsd: toPrismaDecimal(totalUsd),
      },
    });
    rows += 1;
  }

  await prisma.vercelTeamSnapshot.upsert({
    where: { snapshotDate },
    create: {
      snapshotDate,
      planUsd: toPrismaDecimal(teamPlanUsd),
      otherUsd: toPrismaDecimal(teamOtherUsd),
      totalUsd: toPrismaDecimal(teamPlanUsd + teamOtherUsd),
    },
    update: {
      planUsd: toPrismaDecimal(teamPlanUsd),
      otherUsd: toPrismaDecimal(teamOtherUsd),
      totalUsd: toPrismaDecimal(teamPlanUsd + teamOtherUsd),
    },
  });

  logger.info({ rows, period, teamPlanUsd, teamOtherUsd }, 'Vercel sync completed');
  return { rows };
}

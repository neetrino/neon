import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { listAllVercelProjects } from '@/lib/vercel/list-projects';
import {
  fetchVercelCharges,
  dayToFocusRange,
  chargePeriodToDate,
} from '@/lib/vercel/fetch-charges';
import { withBackoff } from '@/lib/sync/retry';

type SyncParams = {
  token: string;
  teamId: string;
  /** Any UTC date — charges for this calendar day will be synced. */
  targetDay: Date;
};

/** Map Vercel ServiceCategory to our cost bucket. */
function toCostBucket(
  serviceCategory: string,
  serviceName: string,
): 'plan' | 'build' | 'function' | 'bandwidth' | 'other' {
  const cat = serviceCategory.toLowerCase();
  const name = serviceName.toLowerCase();

  if (cat === 'subscription licenses') return 'plan';
  if (cat === 'build & deploy') return 'build';
  if (cat === 'vercel functions') return 'function';
  if (cat === 'vercel delivery network') {
    // "Fast Origin Transfer" is egress — treat as bandwidth
    if (name.includes('transfer') || name.includes('bandwidth')) return 'bandwidth';
    return 'other';
  }
  return 'other';
}

function toPrismaDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(10));
}

/**
 * Syncs Vercel billing charges for a single calendar day.
 *
 * For each (projectId|null, serviceName) pair observed in the FOCUS feed,
 * upserts one row in vercel_daily_charges.
 *
 * Also refreshes vercel_projects so any new projects are registered.
 */
export async function syncVercelForDay(params: SyncParams): Promise<{ rows: number }> {
  const { from, to } = dayToFocusRange(params.targetDay);

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
    fetchVercelCharges({ token: params.token, teamId: params.teamId, from, to }),
  );

  // Group by (chargeDate, projectId|null, serviceName) — sum quantities and costs
  type GroupKey = string;
  type GroupValue = {
    chargeDate: string;
    vercelProjectId: string | null;
    serviceName: string;
    serviceCategory: string;
    consumedQty: number;
    consumedUnit: string;
    billedCost: number;
    effectiveCost: number;
  };

  const grouped = new Map<GroupKey, GroupValue>();

  for (const charge of charges) {
    const chargeDate = chargePeriodToDate(charge.ChargePeriodStart);
    const projectId = charge.Tags.ProjectId ?? null;
    const key = `${chargeDate}||${projectId ?? '__team__'}||${charge.ServiceName}`;

    const existing = grouped.get(key);
    if (existing) {
      existing.consumedQty += charge.ConsumedQuantity;
      existing.billedCost += charge.BilledCost;
      existing.effectiveCost += charge.EffectiveCost;
    } else {
      grouped.set(key, {
        chargeDate,
        vercelProjectId: projectId,
        serviceName: charge.ServiceName,
        serviceCategory: charge.ServiceCategory,
        consumedQty: charge.ConsumedQuantity,
        consumedUnit: charge.ConsumedUnit,
        billedCost: charge.BilledCost,
        effectiveCost: charge.EffectiveCost,
      });
    }
  }

  const knownProjectIds = new Set(projects.map((p) => p.id));
  let rows = 0;

  for (const g of grouped.values()) {
    // For project charges, skip unknown projects (deleted/archived)
    const projectIdField = g.vercelProjectId ?? '';
    if (projectIdField !== '' && !knownProjectIds.has(projectIdField)) {
      continue;
    }

    const chargeDate = new Date(`${g.chargeDate}T00:00:00Z`);
    const costBucket = toCostBucket(g.serviceCategory, g.serviceName);

    await prisma.vercelDailyCharge.upsert({
      where: {
        chargeDate_vercelProjectId_serviceName: {
          chargeDate,
          vercelProjectId: projectIdField,
          serviceName: g.serviceName,
        },
      },
      create: {
        chargeDate,
        vercelProjectId: projectIdField,
        serviceName: g.serviceName,
        serviceCategory: costBucket,
        consumedQty: toPrismaDecimal(g.consumedQty),
        consumedUnit: g.consumedUnit,
        billedCost: toPrismaDecimal(g.billedCost),
        effectiveCost: toPrismaDecimal(g.effectiveCost),
      },
      update: {
        serviceCategory: costBucket,
        consumedQty: toPrismaDecimal(g.consumedQty),
        consumedUnit: g.consumedUnit,
        billedCost: toPrismaDecimal(g.billedCost),
        effectiveCost: toPrismaDecimal(g.effectiveCost),
      },
    });
    rows += 1;
  }

  logger.info(
    { rows, chargeDate: params.targetDay.toISOString().slice(0, 10), from, to },
    'Vercel day sync completed',
  );
  return { rows };
}

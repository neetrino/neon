import { prisma } from "@/lib/db";
import { fetchConsumptionHistoryV2 } from "@/lib/neon/fetch-consumption-v2";
import { listAllNeonProjects } from "@/lib/neon/list-projects";
import { addUtcDays, parseIsoDateOnly, toUtcDateOnly } from "@/lib/dates";
import { isIgnoredProjectId } from "@/lib/constants/ignored-projects";
import { mapMetricsToSnapshot } from "@/lib/sync/map-metrics";
import { withBackoff } from "@/lib/sync/retry";
import { logger } from "@/lib/logger";

type SyncParams = {
  apiKey: string;
  orgId: string;
  /** UTC calendar day to store (exclusive end = next day). */
  targetDay: Date;
};

function isoRangeForUtcDay(day: Date): { from: string; to: string } {
  const start = toUtcDateOnly(day);
  const end = addUtcDays(start, 1);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

async function upsertProjectFromList(
  neonProjectId: string,
  name: string,
  regionId?: string,
) {
  await prisma.neonProject.upsert({
    where: { neonProjectId },
    create: { neonProjectId, name, regionId: regionId ?? null },
    update: { name, regionId: regionId ?? null },
  });
}

async function ensureProjectExists(neonProjectId: string) {
  const exists = await prisma.neonProject.findUnique({
    where: { neonProjectId },
  });
  if (!exists) {
    await prisma.neonProject.create({
      data: { neonProjectId, name: neonProjectId },
    });
  }
}

/**
 * Pulls Neon project list + daily consumption for `targetDay` and upserts snapshots.
 */
export async function syncUsageForUtcDay(params: SyncParams): Promise<{ rows: number }> {
  const { from, to } = isoRangeForUtcDay(params.targetDay);

  const projects = await withBackoff("listProjects", () =>
    listAllNeonProjects({ apiKey: params.apiKey, orgId: params.orgId }),
  );
  const listedProjectIds = new Set(projects.map((project) => project.id));

  for (const p of projects) {
    await upsertProjectFromList(p.id, p.name, p.region_id);
  }

  const consumptionProjects = await withBackoff("consumptionV2", () =>
    fetchConsumptionHistoryV2({
      apiKey: params.apiKey,
      orgId: params.orgId,
      fromIso: from,
      toIso: to,
      granularity: "daily",
    }),
  );

  let rows = 0;

  const targetKey = params.targetDay.toISOString().slice(0, 10);

  for (const proj of consumptionProjects) {
    if (isIgnoredProjectId(proj.project_id) || !listedProjectIds.has(proj.project_id)) {
      continue;
    }
    await ensureProjectExists(proj.project_id);

    for (const period of proj.periods) {
      for (const slot of period.consumption) {
        const snapshotDate = parseIsoDateOnly(slot.timeframe_start);
        if (slot.timeframe_start.slice(0, 10) !== targetKey) {
          continue;
        }

        const metrics = mapMetricsToSnapshot(slot.metrics);

        await prisma.usageSnapshot.upsert({
          where: {
            neonProjectId_snapshotDate: {
              neonProjectId: proj.project_id,
              snapshotDate,
            },
          },
          create: {
            neonProjectId: proj.project_id,
            snapshotDate,
            ...metrics,
          },
          update: { ...metrics },
        });
        rows += 1;
      }
    }
  }

  logger.info({ rows, targetDay: params.targetDay.toISOString() }, "Usage sync completed");
  return { rows };
}

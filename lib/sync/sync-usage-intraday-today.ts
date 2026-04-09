import { prisma } from "@/lib/db";
import { getStartOfTodayUtc, parseIsoDateOnly } from "@/lib/dates";
import { isIgnoredProjectId } from "@/lib/constants/ignored-projects";
import { mapMetricsToSnapshot, sumSnapshotMetrics, type SnapshotMetrics } from "@/lib/sync/map-metrics";
import { fetchConsumptionHistoryV2 } from "@/lib/neon/fetch-consumption-v2";
import { listAllNeonProjects } from "@/lib/neon/list-projects";
import { withBackoff } from "@/lib/sync/retry";
import { logger } from "@/lib/logger";

type SyncIntradayParams = {
  apiKey: string;
  orgId: string;
  /** Wall clock for tests; `to` range end is this instant. */
  now?: Date;
};

function emptySnapshot(): SnapshotMetrics {
  return {
    computeUnitSeconds: null,
    rootBranchBytesMonth: null,
    childBranchBytesMonth: null,
    instantRestoreBytesMonth: null,
    publicNetworkTransferBytes: null,
    privateNetworkTransferBytes: null,
    extraBranchesMonth: null,
  };
}

/**
 * Pulls hourly Neon consumption from start of **current UTC day** through `now`, sums slots per project,
 * and upserts one `usage_snapshots` row per project for that calendar day.
 */
export async function syncUsageIntradayToday(params: SyncIntradayParams): Promise<{ rows: number }> {
  const now = params.now ?? new Date();
  const targetDay = getStartOfTodayUtc(now);
  const targetKey = targetDay.toISOString().slice(0, 10);
  const fromIso = targetDay.toISOString();
  const toIso = now.toISOString();

  const projects = await withBackoff("listProjects", () =>
    listAllNeonProjects({ apiKey: params.apiKey, orgId: params.orgId }),
  );
  const listedProjectIds = new Set(projects.map((p) => p.id));

  for (const p of projects) {
    await prisma.neonProject.upsert({
      where: { neonProjectId: p.id },
      create: { neonProjectId: p.id, name: p.name, regionId: p.region_id ?? null },
      update: { name: p.name, regionId: p.region_id ?? null },
    });
  }

  const consumptionProjects = await withBackoff("consumptionV2Hourly", () =>
    fetchConsumptionHistoryV2({
      apiKey: params.apiKey,
      orgId: params.orgId,
      fromIso,
      toIso,
      granularity: "hourly",
    }),
  );

  const mergedByProject = new Map<string, SnapshotMetrics>();

  for (const proj of consumptionProjects) {
    if (isIgnoredProjectId(proj.project_id) || !listedProjectIds.has(proj.project_id)) {
      continue;
    }

    let acc = emptySnapshot();
    let hadSlot = false;

    for (const period of proj.periods) {
      for (const slot of period.consumption) {
        if (slot.timeframe_start.slice(0, 10) !== targetKey) {
          continue;
        }
        hadSlot = true;
        acc = sumSnapshotMetrics(acc, mapMetricsToSnapshot(slot.metrics));
      }
    }

    if (hadSlot) {
      mergedByProject.set(proj.project_id, acc);
    }
  }

  const snapshotDate = parseIsoDateOnly(`${targetKey}T00:00:00.000Z`);
  let rows = 0;

  for (const [neonProjectId, metrics] of mergedByProject) {
    const exists = await prisma.neonProject.findUnique({
      where: { neonProjectId },
    });
    if (!exists) {
      await prisma.neonProject.create({
        data: { neonProjectId, name: neonProjectId },
      });
    }

    await prisma.usageSnapshot.upsert({
      where: {
        neonProjectId_snapshotDate: {
          neonProjectId,
          snapshotDate,
        },
      },
      create: {
        neonProjectId,
        snapshotDate,
        ...metrics,
      },
      update: { ...metrics },
    });
    rows += 1;
  }

  logger.info({ rows, targetDay: targetDay.toISOString() }, "Intraday usage sync completed");
  return { rows };
}

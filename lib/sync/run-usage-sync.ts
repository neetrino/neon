import { evaluateSpendAlertsForSyncedDay } from "@/lib/alerts/evaluate-spend-alerts";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { syncUsageForUtcDay } from "@/lib/sync/sync-usage-day";

type RunUsageSyncParams = {
  apiKey: string;
  orgId: string;
  targetDay: Date;
};

type RunUsageSyncResult = {
  ok: true;
  runId: string;
  rows: number;
  targetDay: string;
};

export async function runUsageSync(params: RunUsageSyncParams): Promise<RunUsageSyncResult> {
  const run = await prisma.syncRun.create({
    data: {
      status: "running",
      targetDate: params.targetDay,
    },
  });

  try {
    const { rows } = await syncUsageForUtcDay({
      apiKey: params.apiKey,
      orgId: params.orgId,
      targetDay: params.targetDay,
    });

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        rowsUpserted: rows,
      },
    });

    try {
      await evaluateSpendAlertsForSyncedDay(params.targetDay);
    } catch (e) {
      logger.error({ err: e }, "Spend alert evaluation failed after sync");
    }

    return {
      ok: true,
      runId: run.id,
      rows,
      targetDay: params.targetDay.toISOString(),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    logger.error({ err: e }, "Usage sync failed");

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "error",
        finishedAt: new Date(),
        errorMessage: message,
      },
    });

    throw new Error(message);
  }
}

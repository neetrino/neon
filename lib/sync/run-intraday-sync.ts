import { evaluateSpendAlertsForSyncedDay } from "@/lib/alerts/evaluate-spend-alerts";
import { getStartOfTodayUtc } from "@/lib/dates";
import { logger } from "@/lib/logger";
import { syncUsageIntradayToday } from "@/lib/sync/sync-usage-intraday-today";

type RunIntradaySyncParams = {
  apiKey: string;
  orgId: string;
  now?: Date;
};

type RunIntradaySyncResult = {
  ok: true;
  rows: number;
  targetDay: string;
};

export async function runIntradaySync(params: RunIntradaySyncParams): Promise<RunIntradaySyncResult> {
  const targetDay = getStartOfTodayUtc(params.now);

  const { rows } = await syncUsageIntradayToday({
    apiKey: params.apiKey,
    orgId: params.orgId,
    now: params.now,
  });

  try {
    await evaluateSpendAlertsForSyncedDay(targetDay);
  } catch (e) {
    logger.error({ err: e }, "Spend alert evaluation failed after intraday sync");
  }

  return {
    ok: true,
    rows,
    targetDay: targetDay.toISOString(),
  };
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { getYesterdayUtc } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { syncUsageForUtcDay } from "@/lib/sync/sync-usage-day";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const env = getEnv();
  if (!env.CRON_SECRET) {
    logger.error("CRON_SECRET is not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetDay = getYesterdayUtc();
  const run = await prisma.syncRun.create({
    data: {
      status: "running",
      targetDate: targetDay,
    },
  });

  try {
    const { rows } = await syncUsageForUtcDay({
      apiKey: env.NEON_API_KEY,
      orgId: env.NEON_ORG_ID,
      targetDay,
    });

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        rowsUpserted: rows,
      },
    });

    return NextResponse.json({ ok: true, targetDay: targetDay.toISOString(), rows });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    logger.error({ err: e }, "Cron sync failed");

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "error",
        finishedAt: new Date(),
        errorMessage: message,
      },
    });

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

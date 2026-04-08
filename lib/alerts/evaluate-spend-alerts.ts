import { prisma } from "@/lib/db";
import { formatSpendAlertTelegramHtml } from "@/lib/alerts/format-spend-alert-message";
import { isIgnoredProjectId } from "@/lib/constants/ignored-projects";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/env";
import { aggregateSnapshotsToProjectUsage } from "@/lib/usage/aggregate-project-costs";
import { sendTelegramMessage } from "@/lib/telegram/send-telegram-message";
import { Prisma } from "@prisma/client";

function isPrismaUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

function decimalToNumber(d: Prisma.Decimal | null | undefined): number | null {
  if (d === null || d === undefined) {
    return null;
  }
  return d.toNumber();
}

function utcDateOnlyIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * After a successful usage sync for `targetDay` (UTC calendar day), notifies Telegram
 * when estimated spend for that day exceeds the per-project or default threshold.
 */
export async function evaluateSpendAlertsForSyncedDay(targetDay: Date): Promise<void> {
  const env = getEnv();
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    logger.info("Telegram spend alerts skipped (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID unset)");
    return;
  }

  const defaultThreshold = env.TELEGRAM_SPEND_ALERT_DEFAULT_USD;
  const pricingPlan = env.NEON_PRICING_PLAN;

  const rows = await prisma.usageSnapshot.findMany({
    where: { snapshotDate: targetDay },
    include: { project: { select: { name: true } } },
  });

  const projectsUsage = aggregateSnapshotsToProjectUsage(rows, targetDay, targetDay, pricingPlan);

  const projectMeta = await prisma.neonProject.findMany({
    select: { neonProjectId: true, spendAlertThresholdUsd: true },
  });
  const thresholdById = new Map<string, number | null>();
  for (const p of projectMeta) {
    thresholdById.set(p.neonProjectId, decimalToNumber(p.spendAlertThresholdUsd));
  }

  for (const p of projectsUsage) {
    if (isIgnoredProjectId(p.neonProjectId)) {
      continue;
    }

    const override = thresholdById.get(p.neonProjectId);
    const thresholdUsd = override ?? defaultThreshold;
    const spendUsd = p.estimatedCost.totalUsd;

    if (spendUsd <= thresholdUsd) {
      continue;
    }

    const existing = await prisma.spendAlertSent.findUnique({
      where: {
        neonProjectId_snapshotDate: {
          neonProjectId: p.neonProjectId,
          snapshotDate: targetDay,
        },
      },
    });
    if (existing) {
      continue;
    }

    const text = formatSpendAlertTelegramHtml({
      projectName: p.name,
      neonProjectId: p.neonProjectId,
      utcDateIso: utcDateOnlyIso(targetDay),
      spendUsd,
      thresholdUsd,
      pricingPlan,
      thresholdSource: override !== null && override !== undefined ? "project" : "default",
      dashboardUrl: env.APP_URL ?? null,
    });

    try {
      await sendTelegramMessage({
        botToken: token,
        chatId,
        text,
        parseMode: "HTML",
      });
    } catch (e) {
      logger.error({ err: e, neonProjectId: p.neonProjectId }, "Telegram spend alert send failed");
      continue;
    }

    try {
      await prisma.spendAlertSent.create({
        data: {
          neonProjectId: p.neonProjectId,
          snapshotDate: targetDay,
          spendUsd: new Prisma.Decimal(spendUsd.toFixed(4)),
          thresholdUsd: new Prisma.Decimal(thresholdUsd.toFixed(4)),
        },
      });
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        continue;
      }
      logger.error({ err: e, neonProjectId: p.neonProjectId }, "Failed to record spend alert");
    }
  }
}

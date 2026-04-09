import { prisma } from "@/lib/db";
import { formatSpendAlertTelegramHtml } from "@/lib/alerts/format-spend-alert-message";
import { isIgnoredProjectId } from "@/lib/constants/ignored-projects";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/env";
import { escalationStepUsd } from "@/lib/constants/spend-alert-default";
import { aggregateSnapshotsToProjectUsage } from "@/lib/usage/aggregate-project-costs";
import type { ProjectUsageAggregate } from "@/components/dashboard/types";
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

function lastNotifiedAnchorUsd(row: {
  lastNotifiedSpendUsd: Prisma.Decimal | null;
  spendUsd: Prisma.Decimal;
}): number {
  const last = decimalToNumber(row.lastNotifiedSpendUsd);
  if (last !== null) {
    return last;
  }
  return row.spendUsd.toNumber();
}

type ThresholdContext = {
  defaultThreshold: number;
  escalationPercentOfThreshold: number;
  thresholdById: Map<string, number | null>;
  token: string;
  chatId: string;
};

async function recordFirstBreach(
  p: ProjectUsageAggregate,
  targetDay: Date,
  thresholdUsd: number,
  spendUsd: number,
  token: string,
  chatId: string,
): Promise<void> {
  const text = formatSpendAlertTelegramHtml({
    projectName: p.name,
    targetDayUtc: targetDay,
    spendUsd,
    thresholdUsd,
    kind: "first",
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
    return;
  }

  try {
    await prisma.spendAlertSent.create({
      data: {
        neonProjectId: p.neonProjectId,
        snapshotDate: targetDay,
        spendUsd: new Prisma.Decimal(spendUsd.toFixed(4)),
        thresholdUsd: new Prisma.Decimal(thresholdUsd.toFixed(4)),
        lastNotifiedSpendUsd: new Prisma.Decimal(spendUsd.toFixed(4)),
      },
    });
  } catch (e) {
    if (isPrismaUniqueViolation(e)) {
      return;
    }
    logger.error({ err: e, neonProjectId: p.neonProjectId }, "Failed to record spend alert");
  }
}

async function sendEscalationAndUpdate(
  p: ProjectUsageAggregate,
  targetDay: Date,
  thresholdUsd: number,
  spendUsd: number,
  anchor: number,
  token: string,
  chatId: string,
): Promise<void> {
  const text = formatSpendAlertTelegramHtml({
    projectName: p.name,
    targetDayUtc: targetDay,
    spendUsd,
    thresholdUsd,
    kind: "escalation",
    previousNotifiedSpendUsd: anchor,
  });

  try {
    await sendTelegramMessage({
      botToken: token,
      chatId,
      text,
      parseMode: "HTML",
    });
  } catch (e) {
    logger.error({ err: e, neonProjectId: p.neonProjectId }, "Telegram spend escalation send failed");
    return;
  }

  try {
    await prisma.spendAlertSent.update({
      where: {
        neonProjectId_snapshotDate: {
          neonProjectId: p.neonProjectId,
          snapshotDate: targetDay,
        },
      },
      data: {
        lastNotifiedSpendUsd: new Prisma.Decimal(spendUsd.toFixed(4)),
      },
    });
  } catch (e) {
    logger.error({ err: e, neonProjectId: p.neonProjectId }, "Failed to update spend alert anchor");
  }
}

async function iterateSpendAlerts(
  projectsUsage: ProjectUsageAggregate[],
  targetDay: Date,
  ctx: ThresholdContext,
): Promise<void> {
  for (const p of projectsUsage) {
    if (isIgnoredProjectId(p.neonProjectId)) {
      continue;
    }

    const override = ctx.thresholdById.get(p.neonProjectId);
    const thresholdUsd = override ?? ctx.defaultThreshold;
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

    if (!existing) {
      await recordFirstBreach(p, targetDay, thresholdUsd, spendUsd, ctx.token, ctx.chatId);
      continue;
    }

    const anchor = lastNotifiedAnchorUsd(existing);
    const escalationDelta = escalationStepUsd(thresholdUsd, ctx.escalationPercentOfThreshold);
    if (spendUsd <= anchor + escalationDelta) {
      continue;
    }

    await sendEscalationAndUpdate(
      p,
      targetDay,
      thresholdUsd,
      spendUsd,
      anchor,
      ctx.token,
      ctx.chatId,
    );
  }
}

/**
 * After a usage sync for `targetDay` (UTC), notifies Telegram when estimated spend exceeds the
 * per-project or default threshold: first breach, then escalations when spend grows by at least
 * `SPEND_ALERT_ESCALATION_PERCENT_OF_THRESHOLD` of that limit since the last notification.
 */
export async function evaluateSpendAlertsForSyncedDay(targetDay: Date): Promise<void> {
  const env = getEnv();
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    logger.info("Telegram spend alerts skipped (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID unset)");
    return;
  }

  const ctx: ThresholdContext = {
    defaultThreshold: env.TELEGRAM_SPEND_ALERT_DEFAULT_USD,
    escalationPercentOfThreshold: env.SPEND_ALERT_ESCALATION_PERCENT_OF_THRESHOLD,
    thresholdById: new Map(),
    token,
    chatId,
  };

  const rows = await prisma.usageSnapshot.findMany({
    where: { snapshotDate: targetDay },
    include: { project: { select: { name: true } } },
  });

  const projectsUsage = aggregateSnapshotsToProjectUsage(
    rows,
    targetDay,
    targetDay,
    env.NEON_PRICING_PLAN,
  );

  const projectMeta = await prisma.neonProject.findMany({
    select: { neonProjectId: true, spendAlertThresholdUsd: true },
  });
  for (const p of projectMeta) {
    ctx.thresholdById.set(p.neonProjectId, decimalToNumber(p.spendAlertThresholdUsd));
  }

  await iterateSpendAlerts(projectsUsage, targetDay, ctx);
}

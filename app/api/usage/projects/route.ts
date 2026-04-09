import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { filterIgnoredProjectIds } from "@/lib/constants/ignored-projects";
import { getEnv } from "@/lib/env";

export async function GET() {
  const env = getEnv();
  const projects = await prisma.neonProject.findMany({
    orderBy: { name: "asc" },
    include: {
      snapshots: {
        orderBy: { snapshotDate: "desc" },
        take: 1,
        select: { snapshotDate: true },
      },
    },
  });

  const payload = projects.map((p) => ({
    neonProjectId: p.neonProjectId,
    name: p.name,
    regionId: p.regionId,
    lastSnapshotDate: p.snapshots[0]?.snapshotDate.toISOString().slice(0, 10) ?? null,
    spendAlertThresholdUsd: p.spendAlertThresholdUsd?.toNumber() ?? null,
  }));

  return NextResponse.json({
    projects: filterIgnoredProjectIds(payload),
    defaultSpendAlertUsd: env.TELEGRAM_SPEND_ALERT_DEFAULT_USD,
    spendAlertEscalationPercentOfThreshold: env.SPEND_ALERT_ESCALATION_PERCENT_OF_THRESHOLD,
  });
}

import { loadEnvConfig } from "@next/env";
import { NEON_USAGE_METRICS, type NeonUsageMetricName } from "@/lib/constants/neon-metrics";
import { addUtcDays, parseIsoDateOnly, toUtcDateOnly } from "@/lib/dates";
import { getEnv } from "@/lib/env";
import { fetchConsumptionHistoryV2 } from "@/lib/neon/fetch-consumption-v2";
import { prisma } from "@/lib/db";

loadEnvConfig(process.cwd());

type MetricTotals = Record<NeonUsageMetricName, bigint>;
type ProjectTotals = Record<string, MetricTotals>;
type CoverageByProject = Record<string, Set<string>>;

function emptyTotals(): MetricTotals {
  return {
    compute_unit_seconds: 0n,
    root_branch_bytes_month: 0n,
    child_branch_bytes_month: 0n,
    instant_restore_bytes_month: 0n,
    public_network_transfer_bytes: 0n,
    private_network_transfer_bytes: 0n,
    extra_branches_month: 0n,
  };
}

function parseArgs(argv: string[]): { from: Date; to: Date; projectId?: string } {
  let fromStr: string | undefined;
  let toStr: string | undefined;
  let projectId: string | undefined;
  for (const a of argv) {
    if (a.startsWith("--from=")) {
      fromStr = a.slice("--from=".length);
    } else if (a.startsWith("--to=")) {
      toStr = a.slice("--to=".length);
    } else if (a.startsWith("--projectId=")) {
      projectId = a.slice("--projectId=".length);
    }
  }
  if (!fromStr || !toStr) {
    throw new Error("Usage: pnpm tsx scripts/reconcile-neon-usage.ts --from=YYYY-MM-DD --to=YYYY-MM-DD [--projectId=<id>]");
  }
  const from = toUtcDateOnly(parseIsoDateOnly(fromStr));
  const to = toUtcDateOnly(parseIsoDateOnly(toStr));
  if (from.getTime() > to.getTime()) {
    throw new Error("--from must be <= --to");
  }
  return { from, to, projectId };
}

function fromDbRows(rows: Array<{ neonProjectId: string } & MetricTotals>): ProjectTotals {
  const out: ProjectTotals = {};
  for (const row of rows) {
    const key = row.neonProjectId;
    const acc = out[key] ?? emptyTotals();
    for (const metric of NEON_USAGE_METRICS) {
      const v = row[metric];
      if (typeof v === "bigint") {
        acc[metric] += v;
      }
    }
    out[key] = acc;
  }
  return out;
}

function fromNeonApi(
  projects: Array<{
    project_id: string;
    periods: Array<{ consumption: Array<{ timeframe_start: string; metrics: Array<{ metric_name: string; value: number }> }> }>;
  }>,
  from: Date,
  to: Date,
  coverageByProject: CoverageByProject,
): ProjectTotals {
  const fromKey = from.toISOString().slice(0, 10);
  const toKey = to.toISOString().slice(0, 10);
  const out: ProjectTotals = {};

  for (const project of projects) {
    const acc = out[project.project_id] ?? emptyTotals();
    for (const period of project.periods) {
      for (const slot of period.consumption) {
        const day = slot.timeframe_start.slice(0, 10);
        if (day < fromKey || day > toKey) {
          continue;
        }
        if (!coverageByProject[project.project_id]?.has(day)) {
          continue;
        }
        for (const metricRow of slot.metrics) {
          const metric = metricRow.metric_name as NeonUsageMetricName;
          if (!NEON_USAGE_METRICS.includes(metric)) {
            continue;
          }
          acc[metric] += BigInt(Math.trunc(metricRow.value));
        }
      }
    }
    out[project.project_id] = acc;
  }

  return out;
}

function diffMetric(a: bigint, b: bigint): bigint {
  return a > b ? a - b : b - a;
}

async function main(): Promise<void> {
  const { from, to, projectId } = parseArgs(process.argv.slice(2));
  const env = getEnv();

  const dbRows = await prisma.usageSnapshot.findMany({
    where: {
      snapshotDate: { gte: from, lte: to },
      ...(projectId ? { neonProjectId: projectId } : {}),
    },
    select: {
      neonProjectId: true,
      snapshotDate: true,
      computeUnitSeconds: true,
      rootBranchBytesMonth: true,
      childBranchBytesMonth: true,
      instantRestoreBytesMonth: true,
      publicNetworkTransferBytes: true,
      privateNetworkTransferBytes: true,
      extraBranchesMonth: true,
    },
  });

  const coverageByProject: CoverageByProject = {};
  const dbMapped = dbRows.map((r) => {
    const day = r.snapshotDate.toISOString().slice(0, 10);
    const coverage = coverageByProject[r.neonProjectId] ?? new Set<string>();
    coverage.add(day);
    coverageByProject[r.neonProjectId] = coverage;

    return {
      neonProjectId: r.neonProjectId,
      compute_unit_seconds: r.computeUnitSeconds ?? 0n,
      root_branch_bytes_month: r.rootBranchBytesMonth ?? 0n,
      child_branch_bytes_month: r.childBranchBytesMonth ?? 0n,
      instant_restore_bytes_month: r.instantRestoreBytesMonth ?? 0n,
      public_network_transfer_bytes: r.publicNetworkTransferBytes ?? 0n,
      private_network_transfer_bytes: r.privateNetworkTransferBytes ?? 0n,
      extra_branches_month: r.extraBranchesMonth ?? 0n,
    };
  });

  const dbTotals = fromDbRows(dbMapped);

  const fromIso = from.toISOString();
  const toIso = addUtcDays(to, 1).toISOString();
  const apiProjects = await fetchConsumptionHistoryV2({
    apiKey: env.NEON_API_KEY,
    orgId: env.NEON_ORG_ID,
    fromIso,
    toIso,
    granularity: "daily",
  });
  const apiTotals = fromNeonApi(apiProjects, from, to, coverageByProject);

  const allProjectIds = new Set<string>([
    ...Object.keys(dbTotals),
    ...Object.keys(apiTotals),
  ]);
  const sorted = [...allProjectIds].sort();

  let hasMismatch = false;
  for (const pid of sorted) {
    const db = dbTotals[pid] ?? emptyTotals();
    const api = apiTotals[pid] ?? emptyTotals();
    const diffs = NEON_USAGE_METRICS
      .map((m) => ({ metric: m, diff: diffMetric(db[m], api[m]) }))
      .filter((x) => x.diff !== 0n);

    if (diffs.length === 0) {
      continue;
    }
    hasMismatch = true;
    console.log(`\n${pid}`);
    for (const d of diffs) {
      console.log(`  ${d.metric}: diff=${d.diff.toString()} db=${db[d.metric].toString()} api=${api[d.metric].toString()}`);
    }
  }

  if (!hasMismatch) {
    console.log("Reconciliation OK: DB matches Neon API for selected range.");
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

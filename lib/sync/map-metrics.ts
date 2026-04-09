import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";

type MetricRow = { metric_name: string; value: number };

export type SnapshotMetrics = {
  computeUnitSeconds: bigint | null;
  rootBranchBytesMonth: bigint | null;
  childBranchBytesMonth: bigint | null;
  instantRestoreBytesMonth: bigint | null;
  publicNetworkTransferBytes: bigint | null;
  privateNetworkTransferBytes: bigint | null;
  extraBranchesMonth: bigint | null;
};

function addBigint(a: bigint | null, b: bigint | null): bigint | null {
  const x = a ?? 0n;
  const y = b ?? 0n;
  const s = x + y;
  return s === 0n ? null : s;
}

/** Sums Neon usage metrics (e.g. hourly slots into one daily snapshot). */
export function sumSnapshotMetrics(a: SnapshotMetrics, b: SnapshotMetrics): SnapshotMetrics {
  return {
    computeUnitSeconds: addBigint(a.computeUnitSeconds, b.computeUnitSeconds),
    rootBranchBytesMonth: addBigint(a.rootBranchBytesMonth, b.rootBranchBytesMonth),
    childBranchBytesMonth: addBigint(a.childBranchBytesMonth, b.childBranchBytesMonth),
    instantRestoreBytesMonth: addBigint(
      a.instantRestoreBytesMonth,
      b.instantRestoreBytesMonth,
    ),
    publicNetworkTransferBytes: addBigint(
      a.publicNetworkTransferBytes,
      b.publicNetworkTransferBytes,
    ),
    privateNetworkTransferBytes: addBigint(
      a.privateNetworkTransferBytes,
      b.privateNetworkTransferBytes,
    ),
    extraBranchesMonth: addBigint(a.extraBranchesMonth, b.extraBranchesMonth),
  };
}

const MAP: Record<NeonUsageMetricName, keyof SnapshotMetrics> = {
  compute_unit_seconds: "computeUnitSeconds",
  root_branch_bytes_month: "rootBranchBytesMonth",
  child_branch_bytes_month: "childBranchBytesMonth",
  instant_restore_bytes_month: "instantRestoreBytesMonth",
  public_network_transfer_bytes: "publicNetworkTransferBytes",
  private_network_transfer_bytes: "privateNetworkTransferBytes",
  extra_branches_month: "extraBranchesMonth",
};

/**
 * Maps Neon API metric rows to Prisma snapshot columns.
 */
export function mapMetricsToSnapshot(metrics: MetricRow[]): SnapshotMetrics {
  const base: SnapshotMetrics = {
    computeUnitSeconds: null,
    rootBranchBytesMonth: null,
    childBranchBytesMonth: null,
    instantRestoreBytesMonth: null,
    publicNetworkTransferBytes: null,
    privateNetworkTransferBytes: null,
    extraBranchesMonth: null,
  };

  for (const row of metrics) {
    const key = MAP[row.metric_name as NeonUsageMetricName];
    if (!key) {
      continue;
    }
    base[key] = BigInt(Math.trunc(row.value));
  }

  return base;
}

import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";

type MetricRow = { metric_name: string; value: number };

type SnapshotMetrics = {
  computeUnitSeconds: bigint | null;
  rootBranchBytesMonth: bigint | null;
  childBranchBytesMonth: bigint | null;
  instantRestoreBytesMonth: bigint | null;
  publicNetworkTransferBytes: bigint | null;
  privateNetworkTransferBytes: bigint | null;
  extraBranchesMonth: bigint | null;
};

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

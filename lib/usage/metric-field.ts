import type { UsageSnapshot } from '@prisma/client';
import type { NeonUsageMetricName } from '@/lib/constants/neon-metrics';

const FIELD_BY_METRIC: Record<NeonUsageMetricName, keyof UsageSnapshot> = {
  compute_unit_seconds: 'computeUnitSeconds',
  root_branch_bytes_month: 'rootBranchBytesMonth',
  child_branch_bytes_month: 'childBranchBytesMonth',
  instant_restore_bytes_month: 'instantRestoreBytesMonth',
  public_network_transfer_bytes: 'publicNetworkTransferBytes',
  private_network_transfer_bytes: 'privateNetworkTransferBytes',
  extra_branches_month: 'extraBranchesMonth',
};

export function readMetricValue(row: UsageSnapshot, metric: NeonUsageMetricName): bigint | null {
  const key = FIELD_BY_METRIC[metric];
  const v = row[key];
  return typeof v === 'bigint' ? v : null;
}

export function metricToSafeNumber(value: bigint | null): number {
  if (value === null) {
    return 0;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  if (Math.abs(n) > Number.MAX_SAFE_INTEGER) {
    return value > 0 ? Number.MAX_SAFE_INTEGER : -Number.MAX_SAFE_INTEGER;
  }
  return n;
}

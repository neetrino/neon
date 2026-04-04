/** Neon consumption_history/v2 metric names (query + storage). */
export const NEON_USAGE_METRICS = [
  'compute_unit_seconds',
  'root_branch_bytes_month',
  'child_branch_bytes_month',
  'instant_restore_bytes_month',
  'public_network_transfer_bytes',
  'private_network_transfer_bytes',
  'extra_branches_month',
] as const;

export type NeonUsageMetricName = (typeof NEON_USAGE_METRICS)[number];

export const NEON_USAGE_METRIC_LABELS: Record<NeonUsageMetricName, string> = {
  compute_unit_seconds: 'Compute (CU·s)',
  root_branch_bytes_month: 'Root branch storage (B·mo)',
  child_branch_bytes_month: 'Child branch storage (B·mo)',
  instant_restore_bytes_month: 'Instant restore (B·mo)',
  public_network_transfer_bytes: 'Public transfer (bytes)',
  private_network_transfer_bytes: 'Private transfer (bytes)',
  extra_branches_month: 'Extra branches (mo)',
};

export const NEON_API_BASE = 'https://console.neon.tech/api/v2';

export const SYNC_MAX_RETRIES = 3;

export const SYNC_RETRY_BASE_MS = 500;

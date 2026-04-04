import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";
import type { ProjectUsageAggregate } from "@/components/dashboard/types";

const SECONDS_PER_CU_HOUR = 3600;
const GIB_BYTES = 1024n ** 3n;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

function metricBigInt(totals: Record<NeonUsageMetricName, string>, key: NeonUsageMetricName): bigint {
  try {
    return BigInt(totals[key] ?? "0");
  } catch {
    return 0n;
  }
}

export type NeonConsoleKpiSums = {
  computeUnitSeconds: bigint;
  storageByteMonth: bigint;
  historyByteMonth: bigint;
  networkBytes: bigint;
};

/**
 * Sums usage across projects for Neon-console-style KPIs (compute, storage, history, network).
 * Storage = root + child branch byte·month; history = instant restore byte·month.
 */
export function sumNeonConsoleKpis(projects: ProjectUsageAggregate[]): NeonConsoleKpiSums {
  let computeUnitSeconds = 0n;
  let storageByteMonth = 0n;
  let historyByteMonth = 0n;
  let networkBytes = 0n;

  for (const p of projects) {
    const t = p.totals;
    computeUnitSeconds += metricBigInt(t, "compute_unit_seconds");
    storageByteMonth += metricBigInt(t, "root_branch_bytes_month") + metricBigInt(t, "child_branch_bytes_month");
    historyByteMonth += metricBigInt(t, "instant_restore_bytes_month");
    networkBytes +=
      metricBigInt(t, "public_network_transfer_bytes") + metricBigInt(t, "private_network_transfer_bytes");
  }

  return { computeUnitSeconds, storageByteMonth, historyByteMonth, networkBytes };
}

function formatTwoDecimalFromQuotient(whole: bigint, fracHundredths: bigint): string {
  const frac = fracHundredths < 10n ? `0${fracHundredths}` : `${fracHundredths}`;
  return `${whole.toString()}.${frac}`;
}

/** Neon-style CU·h label (hours from compute_unit_seconds totals). */
export function formatCuHours(computeUnitSeconds: bigint): string {
  if (computeUnitSeconds === 0n) {
    return "0.00 CU-hrs";
  }
  if (computeUnitSeconds <= MAX_SAFE_BIGINT) {
    return `${(Number(computeUnitSeconds) / SECONDS_PER_CU_HOUR).toFixed(2)} CU-hrs`;
  }
  const hour = SECONDS_PER_CU_HOUR;
  const wholeHours = computeUnitSeconds / BigInt(hour);
  const fracHundredths = ((computeUnitSeconds % BigInt(hour)) * 100n) / BigInt(hour);
  return `${formatTwoDecimalFromQuotient(wholeHours, fracHundredths)} CU-hrs`;
}

/** Display byte-scale totals as decimal GB using binary GiB scaling (matches console-style magnitudes). */
export function formatBytesAsGb(bytes: bigint): string {
  if (bytes === 0n) {
    return "0.00 GB";
  }
  if (bytes <= MAX_SAFE_BIGINT) {
    return `${(Number(bytes) / Number(GIB_BYTES)).toFixed(2)} GB`;
  }
  const whole = bytes / GIB_BYTES;
  const fracHundredths = ((bytes % GIB_BYTES) * 100n) / GIB_BYTES;
  return `${formatTwoDecimalFromQuotient(whole, fracHundredths)} GB`;
}

import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";

const STORAGE_BYTE_MONTH_METRICS: NeonUsageMetricName[] = [
  "root_branch_bytes_month",
  "child_branch_bytes_month",
  "instant_restore_bytes_month",
];

/**
 * Locale-formatted integer for display (totals from API as decimal strings).
 */
export function formatTotalsIntegerString(s: string): string {
  try {
    return BigInt(s).toLocaleString("en-US");
  } catch {
    return s;
  }
}

export function sumStorageByteMonthStrings(
  totals: Record<NeonUsageMetricName, string>,
): bigint {
  let sum = 0n;
  for (const k of STORAGE_BYTE_MONTH_METRICS) {
    try {
      sum += BigInt(totals[k] ?? "0");
    } catch {
      continue;
    }
  }
  return sum;
}

export function bigintToChartSafeNumber(value: bigint): number {
  const n = Number(value);
  if (Number.isFinite(n)) {
    return n;
  }
  return value > 0n ? Number.MAX_SAFE_INTEGER : -Number.MAX_SAFE_INTEGER;
}

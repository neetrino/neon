import type { NeonUsageMetricName } from '@/lib/constants/neon-metrics';

const STORAGE_BYTE_MONTH_METRICS: NeonUsageMetricName[] = [
  'root_branch_bytes_month',
  'child_branch_bytes_month',
  'instant_restore_bytes_month',
];

/**
 * Locale-formatted integer for display (totals from API as decimal strings).
 */
export function formatTotalsIntegerString(s: string): string {
  try {
    return BigInt(s).toLocaleString('en-US');
  } catch {
    return s;
  }
}

export function sumStorageByteMonthStrings(totals: Record<NeonUsageMetricName, string>): bigint {
  let sum = 0n;
  for (const k of STORAGE_BYTE_MONTH_METRICS) {
    try {
      sum += BigInt(totals[k] ?? '0');
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

/**
 * Human-readable scale for summed byte·month (billing unit), not physical disk GB.
 */
export function formatByteMonthSumScaled(byteMonthSum: bigint): string {
  if (byteMonthSum === 0n) {
    return '0 B·mo';
  }
  const n = Number(byteMonthSum);
  if (Number.isFinite(n) && n < Number.MAX_SAFE_INTEGER) {
    const gib = n / 1024 ** 3;
    if (gib >= 1024) {
      return `${(gib / 1024).toFixed(2)} TiB·mo (sum)`;
    }
    if (gib >= 1) {
      return `${gib.toFixed(2)} GiB·mo (sum)`;
    }
    const mib = n / 1024 ** 2;
    if (mib >= 1) {
      return `${mib.toFixed(1)} MiB·mo (sum)`;
    }
    const kib = n / 1024;
    if (kib >= 1) {
      return `${kib.toFixed(0)} KiB·mo (sum)`;
    }
    return `${n.toLocaleString('en-US')} B·mo (sum)`;
  }
  return `${formatTotalsIntegerString(byteMonthSum.toString())} B·mo (sum)`;
}

export function formatAvgBigIntPerDay(totalStr: string, calendarDays: number): string {
  if (calendarDays < 1) {
    return '–';
  }
  try {
    const q = BigInt(totalStr) / BigInt(calendarDays);
    return formatTotalsIntegerString(q.toString());
  } catch {
    return '–';
  }
}

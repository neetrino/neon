import type { NeonUsageMetricName } from '@/lib/constants/neon-metrics';

export const SECONDS_PER_HOUR = 3600;
export const BILLING_HOURS_PER_MONTH = 744;
export const BYTES_PER_DECIMAL_GB = 1_000_000_000;
export const INCLUDED_PUBLIC_TRANSFER_GB = 100;

export type PricingPlan = 'launch' | 'scale';

export type PricingRates = {
  computePerCuHourUsd: number;
  storagePerGbMonthUsd: number;
  instantRestorePerGbMonthUsd: number;
  publicTransferPerGbUsd: number;
  privateTransferPerGbUsd: number;
  branchesPerMonthUsd: number;
  includedChildBranchesPerProject: number;
};

export const PRICING_RATES: Record<PricingPlan, PricingRates> = {
  launch: {
    computePerCuHourUsd: 0.106,
    storagePerGbMonthUsd: 0.35,
    instantRestorePerGbMonthUsd: 0.2,
    publicTransferPerGbUsd: 0.1,
    privateTransferPerGbUsd: 0,
    branchesPerMonthUsd: 1.5,
    includedChildBranchesPerProject: 9,
  },
  scale: {
    computePerCuHourUsd: 0.222,
    storagePerGbMonthUsd: 0.35,
    instantRestorePerGbMonthUsd: 0.2,
    publicTransferPerGbUsd: 0.1,
    privateTransferPerGbUsd: 0.01,
    branchesPerMonthUsd: 1.5,
    includedChildBranchesPerProject: 24,
  },
};

export type RawTotals = Record<NeonUsageMetricName, bigint>;

export type NormalizedTotals = {
  computeCuHours: number;
  storageByteHours: number;
  historyByteHours: number;
  storageGbMonths: number;
  historyGbMonths: number;
  storageAvgGb: number;
  historyAvgGb: number;
  publicTransferGb: number;
  privateTransferGb: number;
  networkTotalGb: number;
  branchMonths: number;
};

export type EstimatedProjectCost = {
  computeUsd: number;
  storageUsd: number;
  historyUsd: number;
  privateTransferUsd: number;
  branchesUsd: number;
  publicTransferRawUsd: number;
  publicTransferGb: number;
  publicTransferBillableGb: number;
  publicTransferUsd: number;
  totalUsd: number;
};

function safeNumber(value: bigint): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return value > 0n ? Number.MAX_SAFE_INTEGER : -Number.MAX_SAFE_INTEGER;
  }
  return n;
}

export function toJsonTotals(raw: RawTotals): Record<NeonUsageMetricName, string> {
  return {
    compute_unit_seconds: raw.compute_unit_seconds.toString(),
    root_branch_bytes_month: raw.root_branch_bytes_month.toString(),
    child_branch_bytes_month: raw.child_branch_bytes_month.toString(),
    instant_restore_bytes_month: raw.instant_restore_bytes_month.toString(),
    public_network_transfer_bytes: raw.public_network_transfer_bytes.toString(),
    private_network_transfer_bytes: raw.private_network_transfer_bytes.toString(),
    extra_branches_month: raw.extra_branches_month.toString(),
  };
}

export function periodHoursFromCalendarDays(days: number): number {
  return Math.max(1, days) * 24;
}

export function normalizeTotals(raw: RawTotals, periodHours: number): NormalizedTotals {
  const computeSeconds = safeNumber(raw.compute_unit_seconds);
  const rootByteHours = safeNumber(raw.root_branch_bytes_month);
  const childByteHours = safeNumber(raw.child_branch_bytes_month);
  const historyByteHours = safeNumber(raw.instant_restore_bytes_month);
  const publicBytes = safeNumber(raw.public_network_transfer_bytes);
  const privateBytes = safeNumber(raw.private_network_transfer_bytes);
  const branchHours = safeNumber(raw.extra_branches_month);

  const storageByteHours = rootByteHours + childByteHours;
  const periodHoursSafe = Math.max(1, periodHours);

  const storageGbMonths = storageByteHours / BILLING_HOURS_PER_MONTH / BYTES_PER_DECIMAL_GB;
  const historyGbMonths = historyByteHours / BILLING_HOURS_PER_MONTH / BYTES_PER_DECIMAL_GB;
  const storageAvgGb = storageByteHours / periodHoursSafe / BYTES_PER_DECIMAL_GB;
  const historyAvgGb = historyByteHours / periodHoursSafe / BYTES_PER_DECIMAL_GB;
  const publicTransferGb = publicBytes / BYTES_PER_DECIMAL_GB;
  const privateTransferGb = privateBytes / BYTES_PER_DECIMAL_GB;

  return {
    computeCuHours: computeSeconds / SECONDS_PER_HOUR,
    storageByteHours,
    historyByteHours,
    storageGbMonths,
    historyGbMonths,
    storageAvgGb,
    historyAvgGb,
    publicTransferGb,
    privateTransferGb,
    networkTotalGb: publicTransferGb + privateTransferGb,
    branchMonths: branchHours / BILLING_HOURS_PER_MONTH,
  };
}

export function estimateProjectCost(
  raw: RawTotals,
  normalized: NormalizedTotals,
  rates: PricingRates,
  periodHours: number,
): EstimatedProjectCost {
  const branchHours = safeNumber(raw.extra_branches_month);
  const freeBranchHours = Math.max(0, periodHours) * rates.includedChildBranchesPerProject;
  const billableBranchHours = Math.max(0, branchHours - freeBranchHours);

  const computeUsd = normalized.computeCuHours * rates.computePerCuHourUsd;
  const storageUsd = normalized.storageGbMonths * rates.storagePerGbMonthUsd;
  const historyUsd = normalized.historyGbMonths * rates.instantRestorePerGbMonthUsd;
  const privateTransferUsd = normalized.privateTransferGb * rates.privateTransferPerGbUsd;
  const branchesUsd = (billableBranchHours / BILLING_HOURS_PER_MONTH) * rates.branchesPerMonthUsd;
  const publicTransferRawUsd = normalized.publicTransferGb * rates.publicTransferPerGbUsd;

  return {
    computeUsd,
    storageUsd,
    historyUsd,
    privateTransferUsd,
    branchesUsd,
    publicTransferRawUsd,
    publicTransferGb: normalized.publicTransferGb,
    publicTransferBillableGb: normalized.publicTransferGb,
    publicTransferUsd: publicTransferRawUsd,
    totalUsd:
      computeUsd +
      storageUsd +
      historyUsd +
      privateTransferUsd +
      branchesUsd +
      publicTransferRawUsd,
  };
}

export function applyPublicTransferAllowance(
  projects: Array<{ estimatedCost: EstimatedProjectCost }>,
  rates: PricingRates,
): void {
  const totalPublicGb = projects.reduce((sum, p) => sum + p.estimatedCost.publicTransferGb, 0);
  const billablePublicGb = Math.max(0, totalPublicGb - INCLUDED_PUBLIC_TRANSFER_GB);
  const ratio = totalPublicGb > 0 ? billablePublicGb / totalPublicGb : 0;

  for (const p of projects) {
    const billableGb = p.estimatedCost.publicTransferGb * ratio;
    const publicTransferUsd = billableGb * rates.publicTransferPerGbUsd;
    p.estimatedCost.publicTransferBillableGb = billableGb;
    p.estimatedCost.publicTransferUsd = publicTransferUsd;
    p.estimatedCost.totalUsd =
      p.estimatedCost.computeUsd +
      p.estimatedCost.storageUsd +
      p.estimatedCost.historyUsd +
      p.estimatedCost.privateTransferUsd +
      p.estimatedCost.branchesUsd +
      publicTransferUsd;
  }
}

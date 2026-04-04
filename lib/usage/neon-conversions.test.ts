import { describe, expect, it } from 'vitest';

import type { NeonUsageMetricName } from '@/lib/constants/neon-metrics';

import {
  estimateProjectCost,
  normalizeTotals,
  periodHoursFromCalendarDays,
  PRICING_RATES,
  toJsonTotals,
  type RawTotals,
} from './neon-conversions';

function zeroRaw(): RawTotals {
  const keys: NeonUsageMetricName[] = [
    'compute_unit_seconds',
    'root_branch_bytes_month',
    'child_branch_bytes_month',
    'instant_restore_bytes_month',
    'public_network_transfer_bytes',
    'private_network_transfer_bytes',
    'extra_branches_month',
  ];
  return Object.fromEntries(keys.map((k) => [k, 0n])) as RawTotals;
}

describe('periodHoursFromCalendarDays', () => {
  it('uses at least 24 hours', () => {
    expect(periodHoursFromCalendarDays(0)).toBe(24);
    expect(periodHoursFromCalendarDays(1)).toBe(24);
    expect(periodHoursFromCalendarDays(7)).toBe(168);
  });
});

describe('toJsonTotals', () => {
  it('stringifies bigint fields', () => {
    const raw = zeroRaw();
    raw.compute_unit_seconds = 3600n;
    const json = toJsonTotals(raw);
    expect(json.compute_unit_seconds).toBe('3600');
  });
});

describe('normalizeTotals', () => {
  it('converts compute seconds to CU-hours', () => {
    const raw = zeroRaw();
    raw.compute_unit_seconds = 3600n;
    const n = normalizeTotals(raw, 24);
    expect(n.computeCuHours).toBe(1);
  });
});

describe('estimateProjectCost', () => {
  it('sums line items for launch plan', () => {
    const raw = zeroRaw();
    raw.compute_unit_seconds = 3600n;
    const periodHours = 24;
    const normalized = normalizeTotals(raw, periodHours);
    const est = estimateProjectCost(raw, normalized, PRICING_RATES.launch, periodHours);
    expect(est.computeUsd).toBeCloseTo(0.106, 5);
    expect(est.totalUsd).toBeCloseTo(est.computeUsd, 5);
  });
});

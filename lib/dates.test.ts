import { describe, expect, it } from 'vitest';

import { addUtcDays, getYesterdayUtc, parseIsoDateOnly, toUtcDateOnly } from './dates';

describe('toUtcDateOnly', () => {
  it('normalizes to UTC midnight', () => {
    const input = new Date(Date.UTC(2026, 3, 4, 15, 30, 0));
    const out = toUtcDateOnly(input);
    expect(out.toISOString()).toBe('2026-04-04T00:00:00.000Z');
  });
});

describe('getYesterdayUtc', () => {
  it('returns previous calendar day in UTC', () => {
    const now = new Date(Date.UTC(2026, 3, 10, 12, 0, 0));
    const y = getYesterdayUtc(now);
    expect(y.toISOString().slice(0, 10)).toBe('2026-04-09');
  });
});

describe('addUtcDays', () => {
  it('adds days in UTC', () => {
    const base = parseIsoDateOnly('2026-01-01');
    const next = addUtcDays(base, 1);
    expect(next.toISOString().slice(0, 10)).toBe('2026-01-02');
  });
});

describe('parseIsoDateOnly', () => {
  it('parses YYYY-MM-DD as UTC midnight', () => {
    const d = parseIsoDateOnly('2026-02-15');
    expect(d.toISOString()).toBe('2026-02-15T00:00:00.000Z');
  });
});

/** Normalizes a Date to UTC midnight (calendar date for @db.Date). */
export function toUtcDateOnly(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

/** Calendar "yesterday" in UTC relative to `now`. */
export function getYesterdayUtc(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - 1);
  return toUtcDateOnly(d);
}

export function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toUtcDateOnly(d);
}

export function parseIsoDateOnly(iso: string): Date {
  const day = iso.slice(0, 10);
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

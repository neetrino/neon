/** Inclusive UTC date range as YYYY-MM-DD. */
export function rangeLastDays(days: number): { from: string; to: string } {
  const end = utcToday();
  const start = addDays(end, -(days - 1));
  return { from: start, to: end };
}

export function utcToday(): string {
  const n = new Date();
  return toIsoDate(n);
}

function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return toIsoDate(dt);
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

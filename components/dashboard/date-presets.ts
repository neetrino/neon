/** Inclusive UTC date range as YYYY-MM-DD. */
export function rangeLastDays(days: number): { from: string; to: string } {
  const end = utcToday();
  const start = addDays(end, -(days - 1));
  return { from: start, to: end };
}

export function rangeCurrentMonthUtc(): { from: string; to: string } {
  const today = utcToday();
  const [y, m] = today.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  return { from, to: today };
}

export function rangePreviousMonthUtc(): { from: string; to: string } {
  const today = utcToday();
  const [y, m] = today.split('-').map(Number);
  const prevYear = m === 1 ? y - 1 : y;
  const prevMonth = m === 1 ? 12 : m - 1;
  const from = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
  const daysInPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
  const to = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(daysInPrevMonth).padStart(2, '0')}`;
  return { from, to };
}

export function utcToday(): string {
  const n = new Date();
  return toIsoDate(n);
}

function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return toIsoDate(dt);
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

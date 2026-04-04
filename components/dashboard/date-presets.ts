/** Vercel bills on the 4th of each month — billing period is 4th → 3rd. */
const VERCEL_BILLING_DAY = 4;

/** Current Vercel billing period: from the most recent 4th to today. */
export function rangeCurrentBillingPeriod(): { from: string; to: string } {
  const today = utcToday();
  const [y, m, d] = today.split('-').map(Number);
  let fromYear = y;
  let fromMonth = m;
  if (d < VERCEL_BILLING_DAY) {
    // Before the 4th: current period started in the previous month
    if (m === 1) {
      fromYear = y - 1;
      fromMonth = 12;
    } else {
      fromMonth = m - 1;
    }
  }
  const from = `${fromYear}-${String(fromMonth).padStart(2, '0')}-${String(VERCEL_BILLING_DAY).padStart(2, '0')}`;
  return { from, to: today };
}

/** Previous Vercel billing period: the full 4th→3rd period before the current one. */
export function rangePreviousBillingPeriod(): { from: string; to: string } {
  const current = rangeCurrentBillingPeriod();
  const [fy, fm] = current.from.split('-').map(Number);
  // Period ends the day before the current period started
  const toDate = new Date(Date.UTC(fy, fm - 1, VERCEL_BILLING_DAY - 1));
  // Period starts on BILLING_DAY of the month before that
  let pYear = fy;
  let pMonth = fm - 1;
  if (pMonth < 1) {
    pYear = fy - 1;
    pMonth = 12;
  }
  const from = `${pYear}-${String(pMonth).padStart(2, '0')}-${String(VERCEL_BILLING_DAY).padStart(2, '0')}`;
  const to = toDate.toISOString().slice(0, 10);
  return { from, to };
}

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

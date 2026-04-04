import { logger } from '@/lib/logger';
import { vercelFocusChargeSchema } from '@/lib/vercel/schemas';
import type { VercelFocusCharge } from '@/lib/vercel/schemas';

const VERCEL_API_BASE = 'https://api.vercel.com';

type FetchChargesParams = {
  token: string;
  teamId: string;
  /** ISO 8601 UTC datetime string — inclusive start (e.g. "2026-04-03T07:00:00Z"). */
  from: string;
  /** ISO 8601 UTC datetime string — exclusive end (e.g. "2026-04-04T07:00:00Z"). */
  to: string;
};

/**
 * Fetches FOCUS v1.3 billing charges for the given UTC datetime range.
 *
 * Returns the full parsed records. The caller is responsible for grouping
 * by day/project/service.
 *
 * Vercel API: GET /v1/billing/charges?teamId=...&from=ISO&to=ISO
 * Response: NDJSON — one JSON object per line.
 */
export async function fetchVercelCharges(params: FetchChargesParams): Promise<VercelFocusCharge[]> {
  const url = new URL(`${VERCEL_API_BASE}/v1/billing/charges`);
  url.searchParams.set('teamId', params.teamId);
  url.searchParams.set('from', params.from);
  url.searchParams.set('to', params.to);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${params.token}`,
      Accept: 'application/x-ndjson',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    // 404 with "costs_not_found" means no billing data for this period — treat as empty
    if (res.status === 404) {
      try {
        const err = JSON.parse(body) as { error?: { code?: string } };
        if (err.error?.code === 'costs_not_found') {
          logger.debug({ from: params.from, to: params.to }, 'Vercel billing: no costs for period');
          return [];
        }
      } catch {
        // fall through to throw
      }
    }
    logger.error(
      { status: res.status, bodyPreview: body.slice(0, 500) },
      'Vercel billing API error',
    );
    throw new Error(`Vercel billing API ${res.status}: ${body.slice(0, 200)}`);
  }

  const text = await res.text();
  const charges: VercelFocusCharge[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    let json: unknown;
    try {
      json = JSON.parse(trimmed) as unknown;
    } catch {
      logger.warn({ preview: trimmed.slice(0, 100) }, 'Vercel billing: skipping non-JSON line');
      continue;
    }

    const parsed = vercelFocusChargeSchema.safeParse(json);
    if (!parsed.success) {
      logger.warn(
        { issues: parsed.error.flatten() },
        'Vercel billing: skipping unrecognized record',
      );
      continue;
    }

    charges.push(parsed.data);
  }

  logger.debug(
    { from: params.from, to: params.to, count: charges.length },
    'Fetched FOCUS charges',
  );
  return charges;
}

/**
 * Returns the UTC date string (YYYY-MM-DD) for a FOCUS ChargePeriodStart.
 * Vercel periods start at 07:00Z, so we use the date portion directly —
 * the calendar date of ChargePeriodStart represents the charge day.
 */
export function chargePeriodToDate(chargePeriodStart: string): string {
  return chargePeriodStart.slice(0, 10);
}

/**
 * Returns the ISO datetime strings for the daily window of a given UTC date.
 * Vercel daily periods run 07:00Z → next day 07:00Z.
 */
export function dayToFocusRange(date: Date): { from: string; to: string } {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const from = `${y}-${m}-${d}T07:00:00Z`;

  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  const yn = next.getUTCFullYear();
  const mn = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dn = String(next.getUTCDate()).padStart(2, '0');
  const to = `${yn}-${mn}-${dn}T07:00:00Z`;

  return { from, to };
}

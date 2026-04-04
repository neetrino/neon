import { logger } from '@/lib/logger';
import { vercelFocusChargeSchema } from '@/lib/vercel/schemas';
import type { VercelCharge } from '@/lib/vercel/schemas';

const VERCEL_API_BASE = 'https://api.vercel.com';

type FetchChargesParams = {
  token: string;
  teamId: string;
  /** Billing period as "YYYY-MM". */
  period: string;
};

/** Returns ISO date strings for the first and last day of the billing period month. */
function periodToDateRange(period: string): { from: string; to: string } {
  const from = `${period}-01`;
  const firstDay = new Date(`${from}T00:00:00.000Z`);
  const lastDay = new Date(firstDay);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  return { from, to: lastDay.toISOString().slice(0, 10) };
}

/** Returns "YYYY-MM" for the billing month of the given UTC date. */
export function billingPeriodForDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Returns the first day of the billing period month as a Date (UTC midnight). */
export function periodStartDate(period: string): Date {
  return new Date(`${period}-01T00:00:00.000Z`);
}

/**
 * Fetches per-project billing charges for a given month from Vercel.
 *
 * Uses the FOCUS-format endpoint:
 *   GET /v1/billing/charges?teamId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * The response is NDJSON — one JSON object per line.
 * Each record is mapped to the internal `VercelCharge` type.
 */
export async function fetchVercelCharges(params: FetchChargesParams): Promise<VercelCharge[]> {
  const { from, to } = periodToDateRange(params.period);

  const url = new URL(`${VERCEL_API_BASE}/v1/billing/charges`);
  url.searchParams.set('teamId', params.teamId);
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);

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
    logger.error(
      { status: res.status, bodyPreview: body.slice(0, 500) },
      'Vercel billing API error',
    );
    throw new Error(`Vercel billing API ${res.status}: ${body.slice(0, 200)}`);
  }

  const text = await res.text();
  const charges: VercelCharge[] = [];

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

    const { ServiceName, ConsumedQuantity, BilledCost, Tags } = parsed.data;
    charges.push({
      resource: ServiceName,
      quantity: ConsumedQuantity,
      price: BilledCost,
      projectId: Tags.ProjectId ?? null,
      projectName: Tags.ProjectName ?? null,
    });
  }

  return charges;
}

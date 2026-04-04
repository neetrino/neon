import { vercelGetJson } from '@/lib/vercel/client';
import { vercelBillingResponseSchema, type VercelCharge } from '@/lib/vercel/schemas';

type FetchChargesParams = {
  token: string;
  teamId: string;
  /** Billing period as "YYYY-MM". Defaults to current period. */
  period: string;
};

/**
 * Fetches per-project billing charges for a given month from Vercel.
 * API: GET /v2/teams/{teamId}/billing/charges?period=YYYY-MM
 */
export async function fetchVercelCharges(params: FetchChargesParams): Promise<VercelCharge[]> {
  const searchParams = new URLSearchParams({ period: params.period });

  const raw = await vercelGetJson<unknown>({
    token: params.token,
    path: `/v2/teams/${params.teamId}/billing/charges`,
    searchParams,
  });

  const parsed = vercelBillingResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid Vercel billing response: ${parsed.error.message}`);
  }

  return parsed.data.charges;
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

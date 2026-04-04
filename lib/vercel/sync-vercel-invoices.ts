import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { vercelGetJson } from './client';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? '';
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID ?? '';

const invoiceGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  total: z.string(),
  subtotal: z.string(),
});

const invoiceLineItemSchema = z
  .object({
    billableItem: z.string().optional(),
    description: z.string().optional(),
    periodStart: z.string().optional(),
    periodEnd: z.string().optional(),
  })
  .passthrough();

const vercelInvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  issuedAt: z.string(),
  amountDue: z.string(),
  currency: z.string().default('usd'),
  groups: z.array(invoiceGroupSchema).default([]),
  lineItems: z.array(invoiceLineItemSchema).default([]),
});

type VercelInvoiceRaw = z.infer<typeof vercelInvoiceSchema>;

function extractPeriod(invoice: VercelInvoiceRaw): { periodStart: Date; periodEnd: Date } | null {
  // Find any line item that has period dates (Pro plan line item is most reliable)
  const withPeriod = invoice.lineItems.find((li) => li.periodStart != null && li.periodEnd != null);
  if (!withPeriod?.periodStart || !withPeriod?.periodEnd) return null;
  return {
    periodStart: new Date(withPeriod.periodStart),
    periodEnd: new Date(withPeriod.periodEnd),
  };
}

/**
 * Fetch all Vercel invoices and upsert into vercel_invoices table.
 * Returns the number of rows upserted.
 */
export async function syncVercelInvoices(): Promise<number> {
  if (!VERCEL_TOKEN) throw new Error('VERCEL_TOKEN is not set');

  const params = new URLSearchParams();
  if (VERCEL_TEAM_ID) params.set('teamId', VERCEL_TEAM_ID);

  const raw = await vercelGetJson<{ data: unknown[] }>({
    token: VERCEL_TOKEN,
    path: '/v1/invoices',
    searchParams: params,
  });

  const invoices = z.array(vercelInvoiceSchema).parse(raw.data);

  let upserted = 0;
  for (const inv of invoices) {
    const period = extractPeriod(inv);
    if (!period) {
      logger.warn(
        { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber },
        'Invoice has no period dates, skipping',
      );
      continue;
    }

    const devexGroup = inv.groups.find((g) => g.id === 'devex');
    const infraGroup = inv.groups.find((g) => g.id === 'managed-infra');

    const platformFeeUsd = devexGroup ? devexGroup.total : '0';
    const infraUsd = infraGroup ? infraGroup.total : '0';

    await prisma.vercelInvoice.upsert({
      where: { id: inv.id },
      create: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issuedAt: new Date(inv.issuedAt),
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        amountDue: inv.amountDue,
        platformFeeUsd,
        infraUsd,
        currency: inv.currency,
      },
      update: {
        invoiceNumber: inv.invoiceNumber,
        issuedAt: new Date(inv.issuedAt),
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        amountDue: inv.amountDue,
        platformFeeUsd,
        infraUsd,
        currency: inv.currency,
      },
    });

    logger.debug(
      { invoiceNumber: inv.invoiceNumber, platformFeeUsd, infraUsd },
      'Upserted invoice',
    );
    upserted++;
  }

  return upserted;
}

/**
 * One-time (and repeatable) sync of Vercel invoices into vercel_invoices table.
 * Fetches all available invoices and upserts them.
 *
 * Usage:
 *   pnpm vercel:sync-invoices
 *
 * Requires: DATABASE_URL, VERCEL_TOKEN, VERCEL_TEAM_ID in env.
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

import { syncVercelInvoices } from '@/lib/vercel/sync-vercel-invoices';
import { prisma } from '@/lib/db';

async function main() {
  const count = await syncVercelInvoices();
  console.log(`Synced ${count} invoices.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

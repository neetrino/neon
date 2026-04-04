/**
 * One-time (and repeatable) backfill: loads Vercel FOCUS billing charges
 * day-by-day from the given date range into vercel_daily_charges.
 *
 * Usage:
 *   pnpm vercel:backfill                          # 2026-01-01 → yesterday
 *   pnpm vercel:backfill -- --from=2026-01-01     # custom start → yesterday
 *   pnpm vercel:backfill -- --from=2026-03-01 --to=2026-03-31
 *
 * Requires: DATABASE_URL, VERCEL_TOKEN, VERCEL_TEAM_ID in env.
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

import { getEnv } from '@/lib/env';
import { runVercelSync } from '@/lib/sync-vercel/run-vercel-sync';
import { prisma } from '@/lib/db';

const USAGE =
  'Usage: pnpm vercel:backfill [-- --from=YYYY-MM-DD [--to=YYYY-MM-DD]]\n' +
  '  Defaults: --from=2026-01-01  --to=<yesterday UTC>\n' +
  '  Requires VERCEL_TOKEN and VERCEL_TEAM_ID in env.';

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function parseArgs(argv: string[]): { from: string; to: string } {
  let from = '2026-01-01';
  let to = yesterdayUtc();

  for (const a of argv) {
    if (a.startsWith('--from=')) from = a.slice('--from='.length);
    else if (a.startsWith('--to=')) to = a.slice('--to='.length);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    console.error('--from and --to must be YYYY-MM-DD.\n' + USAGE);
    process.exit(1);
  }
  if (from > to) {
    console.error('--from must be <= --to');
    process.exit(1);
  }
  return { from, to };
}

function* dayRange(from: string, to: string): Generator<Date> {
  const current = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (current <= end) {
    yield new Date(current);
    current.setUTCDate(current.getUTCDate() + 1);
  }
}

async function main(): Promise<void> {
  const { from, to } = parseArgs(process.argv.slice(2));
  const env = getEnv();

  if (!env.VERCEL_TOKEN || !env.VERCEL_TEAM_ID) {
    console.error('VERCEL_TOKEN and VERCEL_TEAM_ID must be set in env.\n' + USAGE);
    process.exit(1);
  }

  const days = [...dayRange(from, to)];
  console.log(`Backfilling Vercel daily charges: ${from} → ${to} (${days.length} day(s))`);

  let totalRows = 0;
  let daysOk = 0;
  const errors: string[] = [];

  for (const day of days) {
    const key = day.toISOString().slice(0, 10);
    try {
      const result = await runVercelSync({
        token: env.VERCEL_TOKEN,
        teamId: env.VERCEL_TEAM_ID,
        targetDay: day,
      });
      totalRows += result.rows;
      daysOk += 1;
      console.log(`  ${key}: ${result.rows} charge row(s) upserted`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${key}: ${msg}`);
      console.error(`  ERROR ${key}: ${msg}`);
    }
  }

  console.log(
    `\nDone. ${daysOk}/${days.length} day(s) OK, ${totalRows} total charge row(s) upserted.`,
  );

  if (errors.length > 0) {
    console.error(`${errors.length} day(s) failed:\n${errors.join('\n')}`);
    process.exit(1);
  }
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

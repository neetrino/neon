/**
 * One-time backfill: loads Vercel billing charges month-by-month into the DB.
 *
 * Usage:
 *   pnpm vercel:backfill                          # 2026-01 → current month
 *   pnpm vercel:backfill -- --from=2026-01        # 2026-01 → current month
 *   pnpm vercel:backfill -- --from=2026-01 --to=2026-03
 *
 * Requires: DATABASE_URL, VERCEL_TOKEN, VERCEL_TEAM_ID in env.
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

import { getEnv } from '@/lib/env';
import { runVercelSync } from '@/lib/sync-vercel/run-vercel-sync';
import { prisma } from '@/lib/db';

const USAGE =
  'Usage: pnpm vercel:backfill [-- --from=YYYY-MM [--to=YYYY-MM]]\n' +
  '  Defaults: --from=2026-01  --to=<current month>\n' +
  '  Requires VERCEL_TOKEN and VERCEL_TEAM_ID in env.';

function currentYearMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function parseArgs(argv: string[]): { from: string; to: string } {
  let from = '2026-01';
  let to = currentYearMonth();

  for (const a of argv) {
    if (a.startsWith('--from=')) {
      from = a.slice('--from='.length);
    } else if (a.startsWith('--to=')) {
      to = a.slice('--to='.length);
    }
  }

  if (!/^\d{4}-\d{2}$/.test(from) || !/^\d{4}-\d{2}$/.test(to)) {
    console.error('--from and --to must be in YYYY-MM format.\n' + USAGE);
    process.exit(1);
  }
  if (from > to) {
    console.error('--from must be <= --to');
    process.exit(1);
  }
  return { from, to };
}

/** Iterate over calendar months from `from` to `to` inclusive (both "YYYY-MM"). */
function* monthRange(from: string, to: string): Generator<string> {
  let [y, m] = from.split('-').map(Number) as [number, number];
  const [toY, toM] = to.split('-').map(Number) as [number, number];

  while (y < toY || (y === toY && m <= toM)) {
    yield `${y}-${String(m).padStart(2, '0')}`;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
}

async function main(): Promise<void> {
  const { from, to } = parseArgs(process.argv.slice(2));
  const env = getEnv();

  if (!env.VERCEL_TOKEN || !env.VERCEL_TEAM_ID) {
    console.error('VERCEL_TOKEN and VERCEL_TEAM_ID must be set in env.\n' + USAGE);
    process.exit(1);
  }

  const months = [...monthRange(from, to)];
  console.log(`Backfilling Vercel charges: ${from} → ${to} (${months.length} month(s))`);

  let totalRows = 0;
  const errors: string[] = [];

  for (const month of months) {
    const targetDay = new Date(`${month}-01T00:00:00.000Z`);
    try {
      const result = await runVercelSync({
        token: env.VERCEL_TOKEN,
        teamId: env.VERCEL_TEAM_ID,
        targetDay,
      });
      totalRows += result.rows;
      console.log(`  ${month}: ${result.rows} project row(s) upserted  [run=${result.runId}]`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${month}: ${msg}`);
      console.error(`  ERROR ${month}: ${msg}`);
    }
  }

  console.log(
    `\nDone. ${months.length - errors.length}/${months.length} month(s) OK, ${totalRows} total row(s) upserted.`,
  );

  if (errors.length > 0) {
    console.error(`${errors.length} month(s) failed:\n${errors.join('\n')}`);
    process.exit(1);
  }
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

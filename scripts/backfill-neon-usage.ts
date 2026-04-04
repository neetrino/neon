import { loadEnvConfig } from "@next/env";
import { addUtcDays, parseIsoDateOnly, toUtcDateOnly } from "@/lib/dates";
import { getEnv } from "@/lib/env";
import { syncUsageForUtcDay } from "@/lib/sync/sync-usage-day";

loadEnvConfig(process.cwd());

const USAGE =
  "Usage: pnpm usage:backfill -- --from=YYYY-MM-DD --to=YYYY-MM-DD\n" +
  "  Inclusive UTC calendar days. Requires DATABASE_URL, NEON_API_KEY, NEON_ORG_ID in env.";

function parseArgs(argv: string[]): { from: Date; to: Date } {
  let fromStr: string | undefined;
  let toStr: string | undefined;
  for (const a of argv) {
    if (a.startsWith("--from=")) {
      fromStr = a.slice("--from=".length);
    } else if (a.startsWith("--to=")) {
      toStr = a.slice("--to=".length);
    }
  }
  if (!fromStr || !toStr) {
    console.error(USAGE);
    process.exit(1);
  }
  const from = toUtcDateOnly(parseIsoDateOnly(fromStr));
  const to = toUtcDateOnly(parseIsoDateOnly(toStr));
  if (from.getTime() > to.getTime()) {
    console.error("--from must be <= --to");
    process.exit(1);
  }
  return { from, to };
}

async function main(): Promise<void> {
  const { from, to } = parseArgs(process.argv.slice(2));
  const env = getEnv();
  let day = from;
  let totalRows = 0;
  let daysOk = 0;
  const errors: string[] = [];

  while (day.getTime() <= to.getTime()) {
    const key = day.toISOString().slice(0, 10);
    try {
      const { rows } = await syncUsageForUtcDay({
        apiKey: env.NEON_API_KEY,
        orgId: env.NEON_ORG_ID,
        targetDay: day,
      });
      totalRows += rows;
      daysOk += 1;
      console.log(`${key}: ${rows} snapshot row(s)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${key}: ${msg}`);
      console.error(`ERROR ${key}: ${msg}`);
    }
    day = addUtcDays(day, 1);
  }

  console.log(`Done. ${daysOk} day(s) OK, ${totalRows} total snapshot upserts.`);
  if (errors.length > 0) {
    console.error(`${errors.length} day(s) failed.`);
    process.exit(1);
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

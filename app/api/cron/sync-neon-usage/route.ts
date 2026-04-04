import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getEnv } from '@/lib/env';
import { getYesterdayUtc } from '@/lib/dates';
import { logger } from '@/lib/logger';
import { runUsageSync } from '@/lib/sync/run-usage-sync';

export async function GET(request: NextRequest) {
  const env = getEnv();
  if (!env.CRON_SECRET) {
    logger.error('CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const targetDay = getYesterdayUtc();
    const result = await runUsageSync({
      apiKey: env.NEON_API_KEY,
      orgId: env.NEON_ORG_ID,
      targetDay,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    logger.error({ err: e }, 'Cron sync failed');
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

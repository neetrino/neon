import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getEnv } from '@/lib/env';
import { getYesterdayUtc } from '@/lib/dates';
import { logger } from '@/lib/logger';
import { runVercelSync } from '@/lib/sync-vercel/run-vercel-sync';

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

  if (!env.VERCEL_TOKEN || !env.VERCEL_TEAM_ID) {
    logger.error('VERCEL_TOKEN or VERCEL_TEAM_ID is not configured');
    return NextResponse.json({ error: 'Vercel credentials not configured' }, { status: 500 });
  }

  try {
    const targetDay = getYesterdayUtc();
    const result = await runVercelSync({
      token: env.VERCEL_TOKEN,
      teamId: env.VERCEL_TEAM_ID,
      targetDay,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    logger.error({ err: e }, 'Vercel cron sync failed');
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

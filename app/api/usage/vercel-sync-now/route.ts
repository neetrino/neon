import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { getYesterdayUtc } from '@/lib/dates';
import { runVercelSync } from '@/lib/sync-vercel/run-vercel-sync';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const env = getEnv();
    if (!env.VERCEL_TOKEN || !env.VERCEL_TEAM_ID) {
      return NextResponse.json(
        { ok: false, error: 'Vercel credentials not configured' },
        { status: 500 },
      );
    }
    const targetDay = getYesterdayUtc();
    const result = await runVercelSync({
      token: env.VERCEL_TOKEN,
      teamId: env.VERCEL_TEAM_ID,
      targetDay,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    logger.error({ err: e }, 'Vercel manual sync failed');
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

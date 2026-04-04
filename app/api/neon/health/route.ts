import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getEnv } from '@/lib/env';
import type { Env } from '@/lib/env';
import { listProjectsResponseSchema } from '@/lib/neon/schemas';
import { logger } from '@/lib/logger';

const NEON_PROJECTS_URL = 'https://console.neon.tech/api/v2/projects';

function isLoopbackHost(host: string): boolean {
  const h = host.split(':')[0] ?? '';
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

/**
 * Whether this request must present `CRON_SECRET` (public deploy vs local smoke test).
 */
function requiresCronAuth(request: NextRequest, env: Env): boolean {
  if (env.NODE_ENV !== 'production') {
    return false;
  }
  const host = request.headers.get('host') ?? '';
  if (isLoopbackHost(host)) {
    return false;
  }
  return true;
}

/**
 * Verifies `NEON_API_KEY` + `NEON_ORG_ID` against Neon Console API (one project page).
 *
 * - **Local / non-production:** no auth.
 * - **Production on loopback** (e.g. `next start` + `NODE_ENV=production`): no auth.
 * - **Production on the public internet:** requires `Authorization: Bearer <CRON_SECRET>`;
 *   if `CRON_SECRET` is unset, returns 404.
 */
export async function GET(request: NextRequest) {
  let env;
  try {
    env = getEnv();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid environment';
    logger.error({ err: e }, 'Neon health: env validation failed');
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  if (requiresCronAuth(request, env)) {
    if (!env.CRON_SECRET) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const url = new URL(NEON_PROJECTS_URL);
  url.searchParams.set('org_id', env.NEON_ORG_ID);
  url.searchParams.set('limit', '1');

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.NEON_API_KEY}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error';
    logger.error({ err: e }, 'Neon health: fetch failed');
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    logger.warn({ status: res.status, preview: text.slice(0, 200) }, 'Neon health: not JSON');
    return NextResponse.json(
      {
        ok: false,
        neonHttpStatus: res.status,
        error: 'Response was not JSON',
      },
      { status: res.ok ? 502 : res.status },
    );
  }

  const parsed = listProjectsResponseSchema.safeParse(json);
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.flatten() }, 'Neon health: schema mismatch');
    return NextResponse.json(
      {
        ok: false,
        neonHttpStatus: res.status,
        error: 'Unexpected response shape from Neon',
      },
      { status: res.ok ? 502 : res.status },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        neonHttpStatus: res.status,
        error: text.slice(0, 300),
      },
      { status: res.status },
    );
  }

  return NextResponse.json({
    ok: true,
    neonHttpStatus: res.status,
    orgId: env.NEON_ORG_ID,
    sampleProjectCount: parsed.data.projects.length,
    message:
      'Neon Console API accepted the key and org_id. Dashboard data still requires DB sync via /api/cron/sync-neon-usage.',
  });
}

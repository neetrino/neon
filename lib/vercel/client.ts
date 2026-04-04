import { logger } from '@/lib/logger';

type VercelFetchOptions = {
  token: string;
  path: string;
  searchParams?: URLSearchParams;
};

const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Low-level Vercel REST API GET with Bearer auth.
 */
export async function vercelGetJson<T>(options: VercelFetchOptions): Promise<T> {
  const qs = options.searchParams ? `?${options.searchParams.toString()}` : '';
  const url = `${VERCEL_API_BASE}${options.path}${qs}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error(
      { status: res.status, path: options.path, bodyPreview: body.slice(0, 500) },
      'Vercel API error',
    );
    throw new Error(`Vercel API ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

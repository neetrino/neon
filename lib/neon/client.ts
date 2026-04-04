import { logger } from "@/lib/logger";

type NeonFetchOptions = {
  apiKey: string;
  path: string;
  searchParams: URLSearchParams;
};

/**
 * Low-level Neon Console API GET with Bearer auth.
 */
export async function neonGetJson<T>(options: NeonFetchOptions): Promise<T> {
  const url = `https://console.neon.tech/api/v2${options.path}?${options.searchParams.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error(
      { status: res.status, path: options.path, bodyPreview: body.slice(0, 500) },
      "Neon API error",
    );
    throw new Error(`Neon API ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

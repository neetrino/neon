import { logger } from '@/lib/logger';
import { SYNC_MAX_RETRIES, SYNC_RETRY_BASE_MS } from '@/lib/constants/neon-metrics';

export async function withBackoff<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < SYNC_MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const wait = SYNC_RETRY_BASE_MS * 2 ** attempt;
      logger.warn({ label, attempt, wait }, 'Retry after Neon/sync error');
      await new Promise((r) => {
        setTimeout(r, wait);
      });
    }
  }
  throw lastErr;
}

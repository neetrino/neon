import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { syncVercelForDay } from '@/lib/sync-vercel/sync-vercel-day';
import { syncVercelInvoices } from '@/lib/vercel/sync-vercel-invoices';

type RunVercelSyncParams = {
  token: string;
  teamId: string;
  targetDay: Date;
};

type RunVercelSyncResult = {
  ok: true;
  runId: string;
  rows: number;
  targetDay: string;
};

export async function runVercelSync(params: RunVercelSyncParams): Promise<RunVercelSyncResult> {
  const run = await prisma.vercelSyncRun.create({
    data: {
      status: 'running',
      targetDate: params.targetDay,
    },
  });

  try {
    const [{ rows }, invoiceRows] = await Promise.all([
      syncVercelForDay({
        token: params.token,
        teamId: params.teamId,
        targetDay: params.targetDay,
      }),
      syncVercelInvoices(),
    ]);

    logger.debug({ invoiceRows }, 'Synced Vercel invoices');

    await prisma.vercelSyncRun.update({
      where: { id: run.id },
      data: {
        status: 'success',
        finishedAt: new Date(),
        rowsUpserted: rows,
      },
    });

    return {
      ok: true,
      runId: run.id,
      rows,
      targetDay: params.targetDay.toISOString(),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    logger.error({ err: e }, 'Vercel sync failed');

    await prisma.vercelSyncRun.update({
      where: { id: run.id },
      data: {
        status: 'error',
        finishedAt: new Date(),
        errorMessage: message,
      },
    });

    throw new Error(message);
  }
}

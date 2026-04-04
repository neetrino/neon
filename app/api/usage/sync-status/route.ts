import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const SELECT_FIELDS = {
  id: true,
  startedAt: true,
  finishedAt: true,
  status: true,
  errorMessage: true,
  rowsUpserted: true,
  targetDate: true,
} as const;

export async function GET() {
  const [neonRuns, vercelRuns] = await Promise.all([
    prisma.syncRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 8,
      select: SELECT_FIELDS,
    }),
    prisma.vercelSyncRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 8,
      select: SELECT_FIELDS,
    }),
  ]);

  return NextResponse.json({
    runs: neonRuns,
    vercelRuns,
  });
}

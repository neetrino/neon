import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const runs = await prisma.syncRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: 8,
    select: {
      id: true,
      startedAt: true,
      finishedAt: true,
      status: true,
      errorMessage: true,
      rowsUpserted: true,
      targetDate: true,
    },
  });

  return NextResponse.json({ runs });
}

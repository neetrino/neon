import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { filterIgnoredProjectIds } from '@/lib/constants/ignored-projects';

const querySchema = z.object({
  provider: z.enum(['neon', 'vercel', 'all']).default('neon'),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { provider } = querySchema.parse(Object.fromEntries(url.searchParams));

  const [neonProjects, vercelProjects] = await Promise.all([
    provider !== 'vercel'
      ? prisma.neonProject.findMany({
          orderBy: { name: 'asc' },
          include: {
            snapshots: {
              orderBy: { snapshotDate: 'desc' },
              take: 1,
              select: { snapshotDate: true },
            },
          },
        })
      : [],
    provider !== 'neon' ? prisma.vercelProject.findMany({ orderBy: { name: 'asc' } }) : [],
  ]);

  // For each vercel project, find the latest charge date from vercel_daily_charges
  const vercelProjectIds = Array.isArray(vercelProjects)
    ? vercelProjects.map((p) => p.vercelProjectId)
    : [];

  const latestCharges =
    vercelProjectIds.length > 0
      ? await prisma.vercelDailyCharge.groupBy({
          by: ['vercelProjectId'],
          where: { vercelProjectId: { in: vercelProjectIds } },
          _max: { chargeDate: true },
        })
      : [];

  const latestChargeByProject = new Map(
    latestCharges.map((r) => [r.vercelProjectId, r._max.chargeDate]),
  );

  const neonPayload = (Array.isArray(neonProjects) ? neonProjects : []).map((p) => ({
    neonProjectId: p.neonProjectId,
    name: p.name,
    regionId: p.regionId,
    lastSnapshotDate: p.snapshots[0]?.snapshotDate.toISOString().slice(0, 10) ?? null,
    provider: 'neon' as const,
  }));

  const vercelPayload = (Array.isArray(vercelProjects) ? vercelProjects : []).map((p) => ({
    neonProjectId: p.vercelProjectId,
    name: p.name,
    regionId: null,
    lastSnapshotDate:
      latestChargeByProject.get(p.vercelProjectId)?.toISOString().slice(0, 10) ?? null,
    provider: 'vercel' as const,
  }));

  const projects = [...filterIgnoredProjectIds(neonPayload), ...vercelPayload].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return NextResponse.json({ projects });
}

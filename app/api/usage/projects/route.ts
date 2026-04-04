import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { filterIgnoredProjectIds } from "@/lib/constants/ignored-projects";

export async function GET() {
  const projects = await prisma.neonProject.findMany({
    orderBy: { name: "asc" },
    include: {
      snapshots: {
        orderBy: { snapshotDate: "desc" },
        take: 1,
        select: { snapshotDate: true },
      },
    },
  });

  const payload = projects.map((p) => ({
    neonProjectId: p.neonProjectId,
    name: p.name,
    regionId: p.regionId,
    lastSnapshotDate: p.snapshots[0]?.snapshotDate.toISOString().slice(0, 10) ?? null,
  }));

  return NextResponse.json({ projects: filterIgnoredProjectIds(payload) });
}

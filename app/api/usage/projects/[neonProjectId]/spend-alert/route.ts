import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  /** Set to `null` to use org default from env. */
  spendAlertThresholdUsd: z.number().positive().nullable(),
});

type RouteContext = { params: Promise<{ neonProjectId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { neonProjectId } = await context.params;
  if (!neonProjectId) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { spendAlertThresholdUsd } = parsed.data;

  try {
    const updated = await prisma.neonProject.update({
      where: { neonProjectId },
      data: {
        spendAlertThresholdUsd,
      },
      select: { neonProjectId: true, spendAlertThresholdUsd: true },
    });
    return NextResponse.json({
      neonProjectId: updated.neonProjectId,
      spendAlertThresholdUsd: updated.spendAlertThresholdUsd?.toNumber() ?? null,
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
    if (code === "P2025") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    throw e;
  }
}

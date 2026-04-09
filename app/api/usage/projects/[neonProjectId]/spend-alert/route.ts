import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const bodySchema = z
  .object({
    /** Set to `null` to use org default from env. */
    spendAlertThresholdUsd: z.number().positive().nullable().optional(),
    /** Set to `null` to use org default from env. */
    spendAlertEscalationPercentOfThreshold: z.number().min(0.1).max(100).nullable().optional(),
  })
  .refine(
    (d) =>
      d.spendAlertThresholdUsd !== undefined ||
      d.spendAlertEscalationPercentOfThreshold !== undefined,
    { message: "Provide at least one field" },
  );

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

  const data: {
    spendAlertThresholdUsd?: number | null;
    spendAlertEscalationPercentOfThreshold?: number | null;
  } = {};
  if (parsed.data.spendAlertThresholdUsd !== undefined) {
    data.spendAlertThresholdUsd = parsed.data.spendAlertThresholdUsd;
  }
  if (parsed.data.spendAlertEscalationPercentOfThreshold !== undefined) {
    data.spendAlertEscalationPercentOfThreshold = parsed.data.spendAlertEscalationPercentOfThreshold;
  }

  try {
    const updated = await prisma.neonProject.update({
      where: { neonProjectId },
      data,
      select: {
        neonProjectId: true,
        spendAlertThresholdUsd: true,
        spendAlertEscalationPercentOfThreshold: true,
      },
    });
    return NextResponse.json({
      neonProjectId: updated.neonProjectId,
      spendAlertThresholdUsd: updated.spendAlertThresholdUsd?.toNumber() ?? null,
      spendAlertEscalationPercentOfThreshold:
        updated.spendAlertEscalationPercentOfThreshold?.toNumber() ?? null,
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
    if (code === "P2025") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    throw e;
  }
}

import { NextResponse } from "next/server";
import { getYesterdayUtc } from "@/lib/dates";
import { getEnv } from "@/lib/env";
import { runUsageSync } from "@/lib/sync/run-usage-sync";

export async function POST() {
  try {
    const env = getEnv();
    const targetDay = getYesterdayUtc();
    const result = await runUsageSync({
      apiKey: env.NEON_API_KEY,
      orgId: env.NEON_ORG_ID,
      targetDay,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

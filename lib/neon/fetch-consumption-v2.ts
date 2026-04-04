import { NEON_API_BASE, NEON_USAGE_METRICS } from "@/lib/constants/neon-metrics";
import { neonGetJson } from "@/lib/neon/client";
import {
  consumptionHistoryV2ResponseSchema,
  type ConsumptionHistoryV2Response,
} from "@/lib/neon/schemas";

type FetchParams = {
  apiKey: string;
  orgId: string;
  fromIso: string;
  toIso: string;
  granularity: "daily" | "hourly" | "monthly";
};

/**
 * Fetches full v2 consumption history for all projects (paginated).
 */
export async function fetchConsumptionHistoryV2(
  params: FetchParams,
): Promise<ConsumptionHistoryV2Response["projects"]> {
  const merged: ConsumptionHistoryV2Response["projects"] = [];
  let cursor: string | undefined;

  for (;;) {
    const searchParams = new URLSearchParams({
      org_id: params.orgId,
      from: params.fromIso,
      to: params.toIso,
      granularity: params.granularity,
    });
    for (const m of NEON_USAGE_METRICS) {
      searchParams.append("metrics", m);
    }
    searchParams.set("limit", "100");
    if (cursor) {
      searchParams.set("cursor", cursor);
    }

    const raw = await neonGetJson<unknown>({
      apiKey: params.apiKey,
      path: "/consumption_history/v2/projects",
      searchParams,
    });

    const parsed = consumptionHistoryV2ResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid consumption v2 response: ${parsed.error.message}`);
    }

    merged.push(...parsed.data.projects);
    const next = parsed.data.pagination?.cursor;
    if (!next) {
      break;
    }
    cursor = next;
  }

  return merged;
}

export { NEON_API_BASE };

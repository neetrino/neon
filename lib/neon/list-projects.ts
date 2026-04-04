import {
  listProjectsResponseSchema,
  type ListProjectsResponse,
} from "@/lib/neon/schemas";

type ListProjectsParams = {
  apiKey: string;
  orgId: string;
  limit?: number;
};

/**
 * Lists all projects for an org (cursor pagination until exhausted).
 */
export async function listAllNeonProjects(
  params: ListProjectsParams,
): Promise<ListProjectsResponse["projects"]> {
  const limit = params.limit ?? 400;
  const out: ListProjectsResponse["projects"] = [];
  let cursor: string | undefined;

  for (;;) {
    const searchParams = new URLSearchParams({
      org_id: params.orgId,
      limit: String(limit),
    });
    if (cursor) {
      searchParams.set("cursor", cursor);
    }

    const raw = await fetch(
      `https://console.neon.tech/api/v2/projects?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!raw.ok) {
      const t = await raw.text();
      throw new Error(`Neon list projects ${raw.status}: ${t.slice(0, 200)}`);
    }

    const json: unknown = await raw.json();
    const parsed = listProjectsResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Invalid list projects response: ${parsed.error.message}`);
    }

    out.push(...parsed.data.projects);
    const next = parsed.data.pagination?.cursor;
    if (!next || parsed.data.projects.length === 0) {
      break;
    }
    cursor = next;
  }

  return out;
}

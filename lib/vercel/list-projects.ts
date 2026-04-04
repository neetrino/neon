import { vercelGetJson } from '@/lib/vercel/client';
import { vercelProjectsResponseSchema, type VercelProject } from '@/lib/vercel/schemas';

type ListParams = {
  token: string;
  teamId: string;
};

/**
 * Fetches all Vercel projects for the team (paginated).
 */
export async function listAllVercelProjects(params: ListParams): Promise<VercelProject[]> {
  const results: VercelProject[] = [];
  let until: number | undefined;

  for (;;) {
    const searchParams = new URLSearchParams({
      teamId: params.teamId,
      limit: '100',
    });
    if (until !== undefined) {
      searchParams.set('until', String(until));
    }

    const raw = await vercelGetJson<unknown>({
      token: params.token,
      path: '/v9/projects',
      searchParams,
    });

    const parsed = vercelProjectsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid Vercel projects response: ${parsed.error.message}`);
    }

    results.push(...parsed.data.projects);

    const next = parsed.data.pagination?.next;
    if (!next) {
      break;
    }
    until = next;
  }

  return results;
}

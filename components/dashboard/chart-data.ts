import type { SeriesPoint } from '@/components/dashboard/types';

export type RechartsRow = Record<string, string | number>;

/**
 * Builds Recharts-friendly rows: one object per period with dynamic project keys.
 */
export function buildRechartsRows(points: SeriesPoint[]): {
  rows: RechartsRow[];
  projectIds: string[];
} {
  const projectIds = new Set<string>();
  for (const p of points) {
    Object.keys(p.byProject).forEach((id) => projectIds.add(id));
  }
  const ids = [...projectIds].sort();

  const rows: RechartsRow[] = points.map((p) => {
    const row: RechartsRow = { period: p.period };
    for (const id of ids) {
      row[id] = p.byProject[id] ?? 0;
    }
    return row;
  });

  return { rows, projectIds: ids };
}
